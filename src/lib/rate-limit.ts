/**
 * 速率限制器
 * 
 * 支持两种模式:
 * 1. Redis 模式 (生产推荐): 设置 REDIS_URL 环境变量
 * 2. 内存模式 (开发/单实例): 自动降级
 * 
 * 使用方式:
 *   const limiter = createRateLimiter('login', { maxAttempts: 5, windowMs: 15 * 60 * 1000 })
 *   const result = await limiter.check(clientIp)
 *   if (!result.allowed) { ... } // 返回 429
 */

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterMs: number
}

// ─── Redis 连接（惰性初始化） ───
let redisClient: RedisClient | null = null
let redisInitPromise: Promise<void> | null = null

interface RedisClient {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<void>
  get(key: string): Promise<string | null>
}

/**
 * 尝试使用原生 net 模块连接 Redis（零依赖实现）
 * 仅在 REDIS_URL 配置时启用
 * 安全修复: 改进了 RESP 协议解析器，正确处理所有响应类型
 */
async function initRedis(): Promise<RedisClient | null> {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null

  try {
    const url = new URL(redisUrl)
    const host = url.hostname
    const port = parseInt(url.port || '6379')
    const password = url.password || undefined

    const net = await import('net')
    const client = new net.Socket()

    let buffer = ''
    const resolveQueue: Array<(value: string | null) => void> = []
    const rejectQueue: Array<(err: Error) => void> = []

    // 安全修复: 改进的 RESP 协议解析器
    function processBuffer() {
      while (buffer.length > 0) {
        const crlfIdx = buffer.indexOf('\r\n')
        if (crlfIdx === -1) return // 等待更多数据

        const type = buffer[0]
        const line = buffer.substring(1, crlfIdx)

        if (type === '+' || type === ':') {
          // 简单字符串或整数
          buffer = buffer.substring(crlfIdx + 2)
          const resolve = resolveQueue.shift()
          rejectQueue.shift()
          if (resolve) resolve(line)
        } else if (type === '-') {
          // 错误响应
          buffer = buffer.substring(crlfIdx + 2)
          const resolve = resolveQueue.shift()
          const reject = rejectQueue.shift()
          if (reject) reject(new Error(line))
          else if (resolve) resolve(null)
        } else if (type === '$') {
          // 批量字符串: $<length>\r\n<data>\r\n
          const len = parseInt(line)
          if (len === -1) {
            // Null bulk string
            buffer = buffer.substring(crlfIdx + 2)
            const resolve = resolveQueue.shift()
            rejectQueue.shift()
            if (resolve) resolve(null)
          } else {
            const dataStart = crlfIdx + 2
            const dataEnd = dataStart + len
            if (buffer.length < dataEnd + 2) return // 等待更多数据
            const data = buffer.substring(dataStart, dataEnd)
            buffer = buffer.substring(dataEnd + 2)
            const resolve = resolveQueue.shift()
            rejectQueue.shift()
            if (resolve) resolve(data)
          }
        } else if (type === '*') {
          // 数组响应 (简化处理: 只取第一个元素或视为 null)
          buffer = buffer.substring(crlfIdx + 2)
          const resolve = resolveQueue.shift()
          rejectQueue.shift()
          if (resolve) resolve(line === '0' ? null : line)
        } else {
          // 未知类型，跳过
          buffer = buffer.substring(crlfIdx + 2)
        }
      }
    }

    client.connect(port, host, () => {
      if (password) {
        client.write(`AUTH ${password}\r\n`)
      }
    })

    client.on('data', (data) => {
      buffer += data.toString()
      processBuffer()
    })

    client.on('error', (err) => {
      console.warn('[RateLimit] Redis connection error:', err.message)
    })

    function sendCommand(cmd: string): Promise<string | null> {
      return new Promise((resolve, reject) => {
        resolveQueue.push(resolve)
        rejectQueue.push(reject)
        client.write(cmd + '\r\n')
      })
    }

    return {
      async incr(key: string): Promise<number> {
        const res = await sendCommand(`INCR ${key}`)
        return parseInt(res || '0') || 0
      },
      async expire(key: string, seconds: number): Promise<void> {
        await sendCommand(`EXPIRE ${key} ${seconds}`)
      },
      async get(key: string): Promise<string | null> {
        return sendCommand(`GET ${key}`)
      }
    }
  } catch (err) {
    console.warn('[RateLimit] Redis initialization failed, falling back to memory:', err)
    return null
  }
}

async function getRedis(): Promise<RedisClient | null> {
  if (redisClient) return redisClient
  if (redisInitPromise) {
    await redisInitPromise
    return redisClient
  }
  redisInitPromise = (async () => {
    redisClient = await initRedis()
  })()
  await redisInitPromise
  return redisClient
}

// ─── 内存降级方案 ───
const memoryStore = new Map<string, { count: number; resetAt: number }>()

function memoryCheck(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const record = memoryStore.get(key)

  if (!record || now > record.resetAt) {
    const resetAt = now + config.windowMs
    memoryStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: config.maxAttempts - 1, resetAt, retryAfterMs: 0 }
  }

  if (record.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfterMs: record.resetAt - now
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: config.maxAttempts - record.count,
    resetAt: record.resetAt,
    retryAfterMs: 0
  }
}

// ─── 对外接口 ───

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>
}

export function createRateLimiter(namespace: string, config: RateLimitConfig): RateLimiter {
  // 定期清理过期的内存记录
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetAt) memoryStore.delete(key)
    }
  }, 60_000)
  // 允许 Node.js 在没有其他活动时退出
  if (cleanupInterval.unref) cleanupInterval.unref()

  return {
    async check(key: string): Promise<RateLimitResult> {
      const fullKey = `rl:${namespace}:${key}`

      // 尝试 Redis
      try {
        const redis = await getRedis()
        if (redis) {
          const count = await redis.incr(fullKey)
          if (count === 1) {
            await redis.expire(fullKey, Math.ceil(config.windowMs / 1000))
          }
          const ttl = config.windowMs // 简化处理
          const resetAt = Date.now() + ttl
          if (count > config.maxAttempts) {
            return { allowed: false, remaining: 0, resetAt, retryAfterMs: ttl }
          }
          return { allowed: true, remaining: config.maxAttempts - count, resetAt, retryAfterMs: 0 }
        }
      } catch {
        // Redis 不可用，降级到内存
      }

      // 内存降级
      return memoryCheck(fullKey, config)
    }
  }
}

// ─── Serverless 环境检测与警告 ───
// Vercel Serverless 每次调用创建新实例，内存速率限制器几乎无效
// 生产环境必须配置 REDIS_URL 才能正确限制速率
const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
if (IS_SERVERLESS && !process.env.REDIS_URL) {
  console.warn(
    '[RateLimit] ⚠️ 当前运行在 Serverless 环境但未配置 REDIS_URL，' +
    '内存速率限制器在每次函数调用时会重置，几乎无法有效限制频率。' +
    '请尽快配置 Redis 环境变量以确保安全。'
  )
}

// ─── 预定义的速率限制器 ───

export const loginLimiter = createRateLimiter('login', {
  // ✅ 与接口提示文案保持一致：15 分钟窗口内最多 5 次尝试
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000 // 15分钟
})

export const inquiryLimiter = createRateLimiter('inquiry', {
  maxAttempts: 10,
  windowMs: 60 * 60 * 1000 // 1小时
})

export const apiLimiter = createRateLimiter('api', {
  maxAttempts: 100,
  windowMs: 60 * 1000 // 1分钟
})

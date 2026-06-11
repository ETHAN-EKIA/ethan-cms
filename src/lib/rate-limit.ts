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
 */
async function initRedis(): Promise<RedisClient | null> {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null

  try {
    // 使用 ioredis 或原生 Redis 协议
    // 此处使用轻量实现，通过 redis URL 解析连接信息
    const url = new URL(redisUrl)
    const host = url.hostname
    const port = parseInt(url.port || '6379')
    const password = url.password || undefined

    const net = await import('net')
    const client = new net.Socket()

    let buffer = ''
    const resolveQueue: Array<(value: string) => void> = []

    client.connect(port, host, () => {
      if (password) {
        client.write(`AUTH ${password}\r\n`)
      }
    })

    client.on('data', (data) => {
      buffer += data.toString()
      // 简单的 Redis 响应解析
      while (buffer.includes('\r\n')) {
        const lines = buffer.split('\r\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('+') || line.startsWith(':') || line.startsWith('$')) {
            const resolver = resolveQueue.shift()
            if (resolver) resolver(line)
          }
        }
      }
    })

    client.on('error', (err) => {
      console.warn('[RateLimit] Redis connection error:', err.message)
    })

    function sendCommand(cmd: string): Promise<string> {
      return new Promise((resolve) => {
        resolveQueue.push(resolve)
        client.write(cmd + '\r\n')
      })
    }

    return {
      async incr(key: string): Promise<number> {
        const res = await sendCommand(`INCR ${key}`)
        return parseInt(res.replace(':', '')) || 0
      },
      async expire(key: string, seconds: number): Promise<void> {
        await sendCommand(`EXPIRE ${key} ${seconds}`)
      },
      async get(key: string): Promise<string | null> {
        const res = await sendCommand(`GET ${key}`)
        if (res.startsWith('$-1')) return null
        return res.replace(/^\$\d+\r\n/, '').trim() || null
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

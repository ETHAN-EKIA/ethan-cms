import { PrismaClient } from '.prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL!
  // 添加连接超时参数，远程数据库响应较慢
  let finalUrl = url
  try {
    const urlObj = new URL(url)
    if (!urlObj.searchParams.has('connectTimeout')) urlObj.searchParams.set('connectTimeout', '30000')
    if (!urlObj.searchParams.has('pool_timeout')) urlObj.searchParams.set('pool_timeout', '30000')
    finalUrl = urlObj.toString()
  } catch {
    // URL 解析失败则使用原始值
  }
  const adapter = new PrismaMariaDb(finalUrl)
  const client = new PrismaClient({
    adapter,
    log: ['warn', 'error'],
  })
  return client
}

export const prisma = globalForPrisma.prisma || createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Retry wrapper for database operations.
 * If the connection drops (common with remote Railway MySQL), retries up to 2 times.
 *
 * Usage: const result = await withRetry(() => prisma.user.findMany())
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      const isConnectionError =
        msg.includes('ECONNREFUSED') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNRESET') ||
        msg.includes('PROTOCOL_CONNECTION_LOST') ||
        msg.includes('Server has gone away') ||
        msg.includes("Can't add new command") ||
        msg.includes('Connection lost')

      if (isConnectionError && attempt < maxRetries) {
        console.warn(`[DB] Connection error (attempt ${attempt + 1}/${maxRetries}), retrying in ${attempt + 1}s...`)
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  // This line is unreachable but required for TypeScript return type
  throw new Error('withRetry: max retries exceeded')
}

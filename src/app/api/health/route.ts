import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }

  // Check database connectivity
  try {
    await withRetry(() => prisma.$queryRaw`SELECT 1`)
    health.database = 'connected'
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'unknown'
    health.database = 'disconnected'
    health.dbError = msg
    health.status = 'degraded'
  }

  const statusCode = health.status === 'ok' ? 200 : 503
  return NextResponse.json(health, { status: statusCode })
}

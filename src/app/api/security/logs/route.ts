import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { getRecentSecurityLogs, getSecurityStats } from '@/lib/security-log'

/**
 * 安全日志查询 API
 * GET /api/security/logs - 返回最近的安全事件日志和统计
 * 
 * 仅限 ADMIN 角色访问
 */
export const GET = withAuth(async () => {
  const logs = getRecentSecurityLogs(100)
  const stats = getSecurityStats()

  return NextResponse.json({
    logs,
    stats,
    generatedAt: new Date().toISOString(),
    note: '内存日志，重启后清空。生产环境请对接外部日志服务（Datadog/Sentry/Papertrail）。'
  })
}, ['ADMIN'])

/**
 * 安全事件日志记录器
 * 
 * 记录所有安全相关事件（登录失败、权限拒绝、速率限制触发等）
 * 通过 SECURITY_LOG_LEVEL 环境变量控制详细程度:
 *   - "off": 不记录安全日志
 *   - "basic": 仅记录关键事件（401、403、429）
 *   - "verbose": 记录所有安全事件（含请求详情）
 * 
 * 生产环境建议将日志输出到外部日志服务（如 Datadog、Sentry）
 */

type LogLevel = 'off' | 'basic' | 'verbose'
type SecurityEvent = 'AUTH_FAIL' | 'AUTH_SUCCESS' | 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'INPUT_REJECTED' | 'UPLOAD_BLOCKED' | 'SUSPICIOUS_REQUEST'

interface LogEntry {
  timestamp: string
  event: SecurityEvent
  level: 'WARN' | 'ERROR' | 'INFO'
  ip: string
  userAgent: string
  path: string
  method: string
  details: Record<string, unknown>
}

const LOG_LEVEL: LogLevel = (process.env.SECURITY_LOG_LEVEL as LogLevel) || 'basic'

// 内存缓冲区（生产环境应替换为外部日志服务）
const logBuffer: LogEntry[] = []
const MAX_BUFFER_SIZE = 1000

function shouldLog(event: SecurityEvent): boolean {
  if (LOG_LEVEL === 'off') return false
  if (LOG_LEVEL === 'verbose') return true
  // basic: 只记录关键事件
  return ['AUTH_FAIL', 'PERMISSION_DENIED', 'RATE_LIMITED', 'SUSPICIOUS_REQUEST'].includes(event)
}

/**
 * 记录安全事件
 */
export function securityLog(
  event: SecurityEvent,
  req: { url: string; method: string; headers: { get(name: string): string | null } },
  details: Record<string, unknown> = {}
): void {
  if (!shouldLog(event)) return

  const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const ip = rawIp.split(',')[0].trim() || 'unknown'

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    event,
    level: event === 'AUTH_SUCCESS' ? 'INFO' : 'WARN',
    ip,
    userAgent: (req.headers.get('user-agent') || 'unknown').slice(0, 200),
    path: new URL(req.url, 'http://localhost').pathname,
    method: req.method,
    details,
  }

  // 写入缓冲区
  logBuffer.push(entry)
  if (logBuffer.length > MAX_BUFFER_SIZE) logBuffer.shift()

  // 输出到控制台（生产环境会被外部日志服务捕获）
  const prefix = `[SECURITY][${entry.level}][${entry.event}]`
  const summary = `${entry.method} ${entry.path} from ${entry.ip}`

  if (entry.level === 'ERROR') {
    console.error(prefix, summary, JSON.stringify(details))
  } else {
    console.warn(prefix, summary, JSON.stringify(details))
  }
}

/**
 * 获取最近的安全日志（用于管理面板展示）
 */
export function getRecentSecurityLogs(limit = 50): LogEntry[] {
  return logBuffer.slice(-limit).reverse()
}

/**
 * 获取安全统计摘要
 */
export function getSecurityStats(): Record<string, number> {
  const stats: Record<string, number> = {}
  for (const entry of logBuffer) {
    stats[entry.event] = (stats[entry.event] || 0) + 1
  }
  return stats
}

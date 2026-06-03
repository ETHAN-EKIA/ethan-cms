/**
 * CORS 域名白名单管理
 * 
 * 通过环境变量 CORS_ALLOWED_ORIGINS 配置允许的前端域名
 * 格式: "https://domain1.com,https://domain2.com"
 * 
 * 如果未配置则默认允许所有来源（仅开发环境安全）
 */

const allowedOrigins: string[] = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

/**
 * 检查来源是否在白名单中
 */
export function isOriginAllowed(origin: string | null): boolean {
  // 未配置白名单时，开发环境默认允许
  if (allowedOrigins.length === 0) return true
  if (!origin) return true // 同源请求没有 Origin 头
  return allowedOrigins.some(allowed => origin === allowed)
}

/**
 * 获取 CORS 响应头
 * 如果来源在白名单中，返回该来源；否则返回 403 标志
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = isOriginAllowed(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

/**
 * 公共API的宽松CORS头（保持兼容但加缓存控制）
 */
export function getPublicCorsHeaders(origin: string | null): Record<string, string> {
  return {
    ...getCorsHeaders(origin),
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
}

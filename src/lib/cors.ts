/**
 * CORS 域名白名单管理
 * 
 * 通过环境变量 CORS_ALLOWED_ORIGINS 配置允许的前端域名
 * 格式: "https://domain1.com,https://domain2.com"
 * 
 * 生产环境必须配置此变量，未配置时仅允许同源请求
 * 开发环境（NODE_ENV !== 'production'）默认允许所有来源
 */

const allowedOrigins: string[] = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const isProduction = process.env.NODE_ENV === 'production'

/**
 * 检查来源是否在白名单中
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true // 同源请求没有 Origin 头
  // 开发环境默认允许
  if (!isProduction && allowedOrigins.length === 0) return true
  // 生产环境必须配置白名单
  if (allowedOrigins.length === 0) {
    console.warn('[CORS] CORS_ALLOWED_ORIGINS 未配置，生产环境将拒绝跨域请求')
    return false
  }
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
 * 公共API的宽松CORS头（公共数据对所有来源开放）
 * 公共API仅返回只读数据，无安全风险，因此允许任意来源访问
 */
export function getPublicCorsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * Next.js Edge Middleware — 服务端路由保护
 * 在请求到达页面之前检查认证状态，防止未认证用户访问管理页面
 * 这解决了仅依赖客户端 JavaScript 保护的安全漏洞
 */

const PROTECTED_PATHS = ['/admin']
const PUBLIC_ADMIN_PATHS = ['/admin/login']
const API_AUTH_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/me', '/api/health']

function getTokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return request.cookies.get('auth_token')?.value || null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 跳过公开的 admin 路径（登录页）
  if (PUBLIC_ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 保护 admin 页面路由
  if (PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
    const token = getTokenFromRequest(request)

    if (!token) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // ✅ 安全修复：在 Edge Middleware 中验证 JWT 签名（而不是仅检查 payload.exp）
    try {
      const secret = process.env.JWT_SECRET
      if (!secret) throw new Error('JWT_SECRET not configured')
      const key = new TextEncoder().encode(secret)
      await jwtVerify(token, key, { algorithms: ['HS256'] })
    } catch {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 为 API 路由添加安全头
  if (pathname.startsWith('/api/') && !API_AUTH_PATHS.some(p => pathname.startsWith(p))) {
    const response = NextResponse.next()
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
}

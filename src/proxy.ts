import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * Next.js Proxy — 服务端路由保护
 * Next.js 16 使用 proxy.ts 替代已弃用的 middleware.ts
 */

const PROTECTED_PATHS = ['/admin']
const PUBLIC_ADMIN_PATHS = ['/admin/login']
const API_PUBLIC = ['/api/auth/login', '/api/auth/logout', '/api/health', '/api/public/']

function getTokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return request.cookies.get('auth_token')?.value || null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 跳过公开路径
  if (PUBLIC_ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // API 公开路径放行
  if (API_PUBLIC.some(p => pathname.startsWith(p))) {
    const response = NextResponse.next()
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    return response
  }

  // 保护 admin 页面
  if (PROTECTED_PATHS.some(p => pathname.startsWith(p))) {
    const token = getTokenFromRequest(request)
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
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

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
}

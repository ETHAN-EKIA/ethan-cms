import { NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 * 清除 auth_token cookie，使服务端中间件不再允许访问
 */
export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // 立即过期，等同于删除
  })
  return response
}

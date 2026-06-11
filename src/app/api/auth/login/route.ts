import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { verifyPassword, signToken } from '@/lib/auth'
import { loginLimiter } from '@/lib/rate-limit'
import { securityLog } from '@/lib/security-log'

function getClientKey(req: NextRequest): string {
  const raw = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  // x-forwarded-for 可能是逗号分隔的 IP 列表，取第一个作为客户端 IP
  return raw.split(',')[0].trim() || 'unknown'
}

export async function POST(req: NextRequest) {
  try {
    // 速率限制 (Redis优先，内存降级)
    const clientKey = getClientKey(req)
    const rateCheck = await loginLimiter.check(clientKey)
    if (!rateCheck.allowed) {
      securityLog('RATE_LIMITED', req, { type: 'login', ip: clientKey, retryAfterMs: rateCheck.retryAfterMs })
      return NextResponse.json(
        { error: '登录尝试过于频繁，请15分钟后重试' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)),
            'X-RateLimit-Remaining': '0',
          }
        }
      )
    }

    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 })
    }

    if (typeof username !== 'string' || username.length > 100 ||
        typeof password !== 'string' || password.length > 200) {
      securityLog('INPUT_REJECTED', req, { field: 'username/password', reason: 'invalid_format' })
      return NextResponse.json({ error: '输入格式无效' }, { status: 400 })
    }

    const user = await withRetry(() => prisma.user.findUnique({ where: { username } }))
    if (!user) {
      securityLog('AUTH_FAIL', req, { type: 'login', username, reason: 'user_not_found' })
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      securityLog('AUTH_FAIL', req, { type: 'login', username, reason: 'wrong_password' })
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const token = signToken({ userId: user.id, username: user.username, role: user.role })
    securityLog('AUTH_SUCCESS', req, { type: 'login', userId: user.id, username: user.username })

    // 构建响应并设置 auth_token cookie（供服务端中间件验证）
    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatar: user.avatar
      }
    })

    // 设置 httpOnly cookie，与 JWT 过期时间一致（24小时）
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24小时
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

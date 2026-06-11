import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JwtPayload } from './auth'
import { securityLog } from './security-log'

export interface AuthRequest extends NextRequest {
  user?: JwtPayload
}

export function withAuth(
  handler: (req: NextRequest, context: { params: Promise<{ id?: string }>; user: JwtPayload }) => Promise<NextResponse>,
  roles?: string[]
) {
  return async (req: NextRequest, context: { params: Promise<{ id?: string }> }) => {
    const authHeader = req.headers.get('authorization')
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ||
      // ✅ 安全修复：允许从 httpOnly cookie 获取 token，减少前端持久化 Bearer Token 的必要性
      req.cookies.get('auth_token')?.value ||
      null

    if (!token) {
      securityLog('AUTH_FAIL', req, { reason: 'no_token' })
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      securityLog('AUTH_FAIL', req, { reason: 'invalid_token' })
      return NextResponse.json({ error: '认证令牌无效或已过期' }, { status: 401 })
    }

    if (roles && !roles.includes(user.role)) {
      securityLog('PERMISSION_DENIED', req, { userId: user.userId, role: user.role, required: roles })
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    try {
      return await handler(req, { ...context, user })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[API] Error: ${msg}`)

      const isDbError =
        msg.includes('ECONNREFUSED') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNRESET') ||
        msg.includes('Server has gone away') ||
        msg.includes('Connection lost') ||
        msg.includes('Can\'t add new command')

      if (isDbError) {
        return NextResponse.json(
          { error: '数据库连接暂时中断，请稍后重试' },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: '服务器内部错误' },
        { status: 500 }
      )
    }
  }
}

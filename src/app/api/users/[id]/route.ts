import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'
import { hashPassword } from '@/lib/auth'

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    // 字段白名单
    const allowedFields = ['username', 'email', 'displayName', 'role', 'avatar', 'password']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    // 密码强度验证
    if (sanitized.password && typeof sanitized.password === 'string') {
      if (sanitized.password.length < 8) {
        return NextResponse.json({ error: '密码长度至少为8个字符' }, { status: 400 })
      }
      sanitized.password = await hashPassword(sanitized.password as string)
    }
    // 角色验证
    const validRoles = ['ADMIN', 'EDITOR', 'SALES']
    if (sanitized.role && !validRoles.includes(sanitized.role as string)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 })
    }
    // 邮箱验证
    if (sanitized.email && (typeof sanitized.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.email as string))) {
      return NextResponse.json({ error: '邮箱格式无效' }, { status: 400 })
    }

    const user = await prisma.user.update({ where: { id }, data: sanitized as never })
    return NextResponse.json({ id: user.id, username: user.username, email: user.email, role: user.role })
  } catch { return NextResponse.json({ error: '更新用户失败' }, { status: 400 }) }
}, ['ADMIN'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch { return NextResponse.json({ error: '删除用户失败' }, { status: 400 }) }
}, ['ADMIN'])

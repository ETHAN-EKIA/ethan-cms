import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'
import { hashPassword } from '@/lib/auth'

export const GET = withAuth(async () => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, displayName: true, role: true, avatar: true, createdAt: true }
  })
  return NextResponse.json(users)
}, ['ADMIN'])

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { username, password, email, displayName, role } = await req.json()

    // 安全修复: 输入验证
    if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_-]{3,50}$/.test(username)) {
      return NextResponse.json({ error: '用户名格式无效（3-50个字符，仅允许字母、数字、下划线和连字符）' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: '密码长度至少为8个字符' }, { status: 400 })
    }
    if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json({ error: '邮箱格式无效' }, { status: 400 })
    }
    const validRoles = ['ADMIN', 'EDITOR', 'SALES']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 })
    }

    const hashed = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        password: hashed,
        email: email?.trim() || null,
        displayName: displayName?.trim() || null,
        role: role || 'EDITOR'
      }
    })
    return NextResponse.json({ id: user.id, username: user.username, email: user.email, role: user.role }, { status: 201 })
  } catch { return NextResponse.json({ error: '创建用户失败' }, { status: 400 }) }
}, ['ADMIN'])

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'
import { verifyPassword, hashPassword } from '@/lib/auth'

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '请输入当前密码和新密码' }, { status: 400 })
    }

    // 安全修复: 密码复杂度验证
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: '新密码长度至少为8个字符' }, { status: 400 })
    }
    if (newPassword.length > 200) {
      return NextResponse.json({ error: '密码过长' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } })
    if (!dbUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const valid = await verifyPassword(currentPassword, dbUser.password)
    if (!valid) {
      return NextResponse.json({ error: '当前密码错误' }, { status: 400 })
    }

    // 安全修复: 防止使用相同密码
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: '新密码不能与当前密码相同' }, { status: 400 })
    }

    const hashed = await hashPassword(newPassword)
    await prisma.user.update({ where: { id: user.userId }, data: { password: hashed } })

    return NextResponse.json({ message: '密码修改成功' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
})

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'
import { hashPassword } from '@/lib/auth'

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()
    if (data.password) data.password = await hashPassword(data.password)
    const user = await prisma.user.update({ where: { id }, data })
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

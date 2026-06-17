import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: { product: { select: { id: true, name: true, slug: true } }, assignee: { select: { id: true, displayName: true } } }
  })
  if (!inquiry) return NextResponse.json({ error: '询盘不存在' }, { status: 404 })
  return NextResponse.json(inquiry)
})

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    // 安全修复: 字段白名单，只允许更新以下字段
    const allowedFields = ['status', 'assigneeId', 'note', 'reply', 'priority']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: '未提供有效的更新字段' }, { status: 400 })
    }

    const inquiry = await prisma.inquiry.update({ where: { id }, data: sanitized })
    return NextResponse.json(inquiry)
  } catch (error) {
    console.error('Update inquiry error:', error)
    return NextResponse.json({ error: '更新询盘失败' }, { status: 400 })
  }
}, ['ADMIN', 'SALES'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.inquiry.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete inquiry error:', error)
    return NextResponse.json({ error: '删除询盘失败' }, { status: 400 })
  }
}, ['ADMIN'])

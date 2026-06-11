import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  const customer = await prisma.customer.findUnique({ where: { id }, include: { orders: { orderBy: { createdAt: 'desc' } } } })
  if (!customer) return NextResponse.json({ error: '客户不存在' }, { status: 404 })
  return NextResponse.json(customer)
})

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    if (data.email && (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) {
      return NextResponse.json({ error: '邮箱格式无效' }, { status: 400 })
    }

    const allowedFields = ['name', 'country', 'email', 'whatsapp', 'phone', 'company', 'totalOrders', 'totalAmount', 'notes', 'tags']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    return NextResponse.json(await prisma.customer.update({ where: { id }, data: sanitized as never }))
  } catch { return NextResponse.json({ error: '更新客户失败' }, { status: 400 }) }
}, ['ADMIN', 'SALES'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.customer.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json({ error: '删除客户失败（如存在关联订单请先删除订单）' }, { status: 400 })
  }
}, ['ADMIN'])

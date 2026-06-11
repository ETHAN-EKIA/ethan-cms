import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, items: { include: { product: { select: { id: true, name: true } } } } } })
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  return NextResponse.json(order)
})

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    const validStatuses = ['PENDING', 'PAID', 'PRODUCTION', 'SHIPPED', 'COMPLETED', 'CANCELLED']
    if (data.status && !validStatuses.includes(data.status)) {
      return NextResponse.json({ error: '无效的订单状态' }, { status: 400 })
    }

    const allowedFields = ['customerId', 'status', 'totalAmount', 'currency', 'trackingNo', 'notes']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    return NextResponse.json(await prisma.order.update({ where: { id }, data: sanitized as never }))
  } catch { return NextResponse.json({ error: '更新订单失败' }, { status: 400 }) }
}, ['ADMIN', 'SALES'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.order.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete order error:', error)
    return NextResponse.json({ error: '删除订单失败' }, { status: 400 })
  }
}, ['ADMIN'])

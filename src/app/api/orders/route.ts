import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status')
  const search = searchParams.get('search') || ''

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) { where.OR = [{ orderNo: { contains: search } }, { trackingNo: { contains: search } }] }

  const [total, orders] = await withRetry(() => Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, include: { customer: { select: { id: true, name: true } }, _count: { select: { items: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit })
  ]))
  return NextResponse.json({ data: orders, total, page, limit, totalPages: Math.ceil(total / limit) })
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()
    const orderNo = `ORD-${Date.now().toString(36).toUpperCase()}`
    const order = await prisma.order.create({ data: { ...data, orderNo } })
    return NextResponse.json(order, { status: 201 })
  } catch { return NextResponse.json({ error: '创建订单失败' }, { status: 400 }) }
}, ['ADMIN', 'SALES'])

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
    return NextResponse.json(await prisma.customer.update({ where: { id }, data }))
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

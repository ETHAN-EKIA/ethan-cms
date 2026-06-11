import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { company: { contains: search } }, { country: { contains: search } }]
  }

  const [total, customers] = await withRetry(() => Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit })
  ]))
  return NextResponse.json({ data: customers, total, page, limit, totalPages: Math.ceil(total / limit) })
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()

    if (!data.name || typeof data.name !== 'string' || data.name.length > 200) {
      return NextResponse.json({ error: '请填写有效的客户名称' }, { status: 400 })
    }
    if (data.email && (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))) {
      return NextResponse.json({ error: '邮箱格式无效' }, { status: 400 })
    }

    const allowedFields = ['name', 'country', 'email', 'whatsapp', 'phone', 'company', 'notes', 'tags']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    const customer = await prisma.customer.create({ data: sanitized as never })
    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: '创建客户失败' }, { status: 400 })
  }
}, ['ADMIN', 'SALES'])

import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (categoryId) where.categoryId = categoryId
  if (status) where.status = status
  if (search) {
    where.OR = [
      { sku: { contains: search } },
      { brand: { contains: search } },
      { slug: { contains: search } },
    ]
  }

  const [total, products] = await withRetry(() => Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * limit,
      take: limit
    })
  ]))

  return NextResponse.json({ data: products, total, page, limit, totalPages: Math.ceil(total / limit) })
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()

    // 安全修复: 输入验证
    if (!data.slug || typeof data.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
      return NextResponse.json({ error: 'Slug 格式无效（仅允许小写字母、数字和连字符）' }, { status: 400 })
    }
    if (!data.name || typeof data.name !== 'object') {
      return NextResponse.json({ error: '产品名称不能为空' }, { status: 400 })
    }
    if (data.price != null && (isNaN(Number(data.price)) || Number(data.price) < 0)) {
      return NextResponse.json({ error: '价格无效' }, { status: 400 })
    }

    // 安全修复: 只允许已知字段
    const allowedFields = [
      'name', 'slug', 'sku', 'categoryId', 'price', 'stock', 'moq', 'brand',
      'badge', 'summary', 'highlights', 'details', 'logistics', 'images',
      'seoTitle', 'seoDesc', 'seoKeywords', 'status', 'sortOrder'
    ]
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    const product = await prisma.product.create({ data: sanitized as never })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: '创建产品失败' }, { status: 400 })
  }
}, ['ADMIN', 'EDITOR'])

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true, slug: true } } }
  })
  if (!product) {
    return NextResponse.json({ error: '产品不存在' }, { status: 404 })
  }
  return NextResponse.json(product)
})

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    // 安全修复: 只允许已知字段更新
    const allowedFields = [
      'name', 'slug', 'sku', 'categoryId', 'price', 'stock', 'moq', 'brand',
      'badge', 'summary', 'highlights', 'details', 'logistics', 'images',
      'seoTitle', 'seoDesc', 'seoKeywords', 'status', 'sortOrder'
    ]
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    // 安全修复: slug格式验证
    if (sanitized.slug && typeof sanitized.slug === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sanitized.slug)) {
      return NextResponse.json({ error: 'Slug 格式无效' }, { status: 400 })
    }

    const product = await prisma.product.update({ where: { id }, data: sanitized as never })
    return NextResponse.json(product)
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: '更新产品失败' }, { status: 400 })
  }
}, ['ADMIN', 'EDITOR'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json({ error: '删除产品失败' }, { status: 400 })
  }
}, ['ADMIN'])

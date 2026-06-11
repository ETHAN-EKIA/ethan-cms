import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest) => {
  const categories = await withRetry(() => prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' }
  }))
  return NextResponse.json(categories)
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()

    // 输入验证
    if (!data.slug || typeof data.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
      return NextResponse.json({ error: 'Slug 格式无效（仅允许小写字母、数字和连字符）' }, { status: 400 })
    }
    if (!data.name || typeof data.name !== 'object') {
      return NextResponse.json({ error: '分类名称不能为空' }, { status: 400 })
    }

    // 字段白名单
    const allowedFields = ['name', 'slug', 'icon', 'sortOrder']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    const category = await prisma.category.create({ data: sanitized as never })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json({ error: '创建分类失败' }, { status: 400 })
  }
}, ['ADMIN', 'EDITOR'])

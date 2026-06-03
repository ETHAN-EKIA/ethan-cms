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
    const category = await prisma.category.create({ data })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json({ error: '创建分类失败' }, { status: 400 })
  }
}, ['ADMIN', 'EDITOR'])

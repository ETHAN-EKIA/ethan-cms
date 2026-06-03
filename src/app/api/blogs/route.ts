import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status')
  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const [total, blogs] = await withRetry(() => Promise.all([
    prisma.blog.count({ where }),
    prisma.blog.findMany({ where, include: { author: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit })
  ]))
  return NextResponse.json({ data: blogs, total, page, limit, totalPages: Math.ceil(total / limit) })
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()
    const blog = await prisma.blog.create({ data })
    return NextResponse.json(blog, { status: 201 })
  } catch { return NextResponse.json({ error: '创建文章失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

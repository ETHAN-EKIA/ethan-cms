import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  const blog = await prisma.blog.findUnique({ where: { id }, include: { author: { select: { id: true, displayName: true } } } })
  if (!blog) return NextResponse.json({ error: '文章不存在' }, { status: 404 })
  return NextResponse.json(blog)
})

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    const validStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED']
    if (data.status && !validStatuses.includes(data.status)) {
      return NextResponse.json({ error: '无效的状态值' }, { status: 400 })
    }

    const allowedFields = ['title', 'slug', 'content', 'excerpt', 'coverImage', 'images', 'authorId', 'status', 'seoTitle', 'seoDesc']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    // slug 格式验证
    if (sanitized.slug && typeof sanitized.slug === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sanitized.slug)) {
      return NextResponse.json({ error: 'Slug 格式无效' }, { status: 400 })
    }

    return NextResponse.json(await prisma.blog.update({ where: { id }, data: sanitized as never }))
  }
  catch { return NextResponse.json({ error: '更新文章失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.blog.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete blog error:', error)
    return NextResponse.json({ error: '删除文章失败' }, { status: 400 })
  }
}, ['ADMIN'])

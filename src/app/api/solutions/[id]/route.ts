import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    // 字段白名单
    const allowedFields = ['name', 'slug', 'description', 'icon', 'image', 'productCount', 'sortOrder']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    // slug 格式验证
    if (sanitized.slug && typeof sanitized.slug === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sanitized.slug)) {
      return NextResponse.json({ error: 'Slug 格式无效' }, { status: 400 })
    }

    return NextResponse.json(await prisma.solution.update({ where: { id }, data: sanitized as never }))
  }
  catch { return NextResponse.json({ error: '更新解决方案失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.solution.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete solution error:', error)
    return NextResponse.json({ error: '删除解决方案失败' }, { status: 400 })
  }
}, ['ADMIN'])

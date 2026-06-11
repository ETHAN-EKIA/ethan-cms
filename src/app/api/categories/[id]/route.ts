import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    // 字段白名单
    const allowedFields = ['name', 'slug', 'icon', 'sortOrder']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    // slug 格式验证
    if (sanitized.slug && typeof sanitized.slug === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sanitized.slug)) {
      return NextResponse.json({ error: 'Slug 格式无效' }, { status: 400 })
    }

    const category = await prisma.category.update({ where: { id }, data: sanitized as never })
    return NextResponse.json(category)
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json({ error: '更新分类失败' }, { status: 400 })
  }
}, ['ADMIN', 'EDITOR'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const count = await prisma.product.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json({ error: '该分类下还有产品，无法删除' }, { status: 400 })
    }
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json({ error: '删除分类失败' }, { status: 400 })
  }
}, ['ADMIN'])

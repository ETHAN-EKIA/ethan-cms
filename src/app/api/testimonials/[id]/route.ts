import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    // stars 范围验证
    if (data.stars !== undefined && (typeof data.stars !== 'number' || data.stars < 1 || data.stars > 5)) {
      return NextResponse.json({ error: '评分必须为 1-5 的整数' }, { status: 400 })
    }

    // 字段白名单
    const allowedFields = ['author', 'role', 'text', 'stars', 'image', 'company', 'country', 'sortOrder']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    return NextResponse.json(await prisma.testimonial.update({ where: { id }, data: sanitized as never }))
  }
  catch { return NextResponse.json({ error: '更新客户反馈失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.testimonial.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete testimonial error:', error)
    return NextResponse.json({ error: '删除客户反馈失败' }, { status: 400 })
  }
}, ['ADMIN'])

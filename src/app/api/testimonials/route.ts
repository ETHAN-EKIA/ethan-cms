import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async () => {
  return NextResponse.json(await withRetry(() => prisma.testimonial.findMany({ orderBy: { sortOrder: 'asc' } })))
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()

    // stars 范围验证
    if (data.stars !== undefined && (typeof data.stars !== 'number' || data.stars < 1 || data.stars > 5)) {
      return NextResponse.json({ error: '评分必须为 1-5 的整数' }, { status: 400 })
    }
    if (!data.author || typeof data.author !== 'object') {
      return NextResponse.json({ error: '作者不能为空' }, { status: 400 })
    }

    // 字段白名单
    const allowedFields = ['author', 'role', 'text', 'stars', 'image', 'company', 'country', 'sortOrder']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    return NextResponse.json(await prisma.testimonial.create({ data: sanitized as never }), { status: 201 })
  }
  catch { return NextResponse.json({ error: '创建客户反馈失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

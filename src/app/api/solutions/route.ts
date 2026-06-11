import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async () => {
  return NextResponse.json(await withRetry(() => prisma.solution.findMany({ orderBy: { sortOrder: 'asc' } })))
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()

    // slug 验证
    if (!data.slug || typeof data.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
      return NextResponse.json({ error: 'Slug 格式无效（仅允许小写字母、数字和连字符）' }, { status: 400 })
    }

    // 字段白名单
    const allowedFields = ['name', 'slug', 'description', 'icon', 'image', 'productCount', 'sortOrder']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    return NextResponse.json(await prisma.solution.create({ data: sanitized as never }), { status: 201 })
  }
  catch { return NextResponse.json({ error: '创建解决方案失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

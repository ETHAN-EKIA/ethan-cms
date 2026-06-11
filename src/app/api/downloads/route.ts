import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async () => {
  const downloads = await withRetry(() => prisma.download.findMany({ include: { product: { select: { id: true, name: true } } }, orderBy: { sortOrder: 'asc' } }))
  return NextResponse.json(downloads)
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()

    // type 验证
    const validTypes = ['PDF', 'ZIP', 'DOC', 'OTHER']
    if (data.type && !validTypes.includes(data.type)) {
      return NextResponse.json({ error: `无效的文件类型，仅允许: ${validTypes.join(', ')}` }, { status: 400 })
    }

    // 字段白名单
    const allowedFields = ['name', 'type', 'fileUrl', 'fileSize', 'version', 'productId', 'sortOrder']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    return NextResponse.json(await prisma.download.create({ data: sanitized as never }), { status: 201 })
  }
  catch { return NextResponse.json({ error: '创建下载项失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

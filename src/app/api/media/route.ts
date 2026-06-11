import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const folder = searchParams.get('folder')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '30')
  const where: Record<string, unknown> = {}
  if (folder) where.folder = folder

  const [total, media] = await withRetry(() => Promise.all([
    prisma.media.count({ where }),
    prisma.media.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit })
  ]))
  return NextResponse.json({ data: media, total, page, limit })
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()

    if (!data.url || typeof data.url !== 'string' || data.url.length > 1000) {
      return NextResponse.json({ error: 'URL 无效' }, { status: 400 })
    }

    const allowedFields = ['url', 'filename', 'mimeType', 'size', 'folder', 'alt']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    const media = await prisma.media.create({ data: sanitized as never })
    return NextResponse.json(media, { status: 201 })
  } catch { return NextResponse.json({ error: '创建媒体记录失败' }, { status: 400 }) }
})

import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async () => {
  const downloads = await withRetry(() => prisma.download.findMany({ include: { product: { select: { id: true, name: true } } }, orderBy: { sortOrder: 'asc' } }))
  return NextResponse.json(downloads)
})

export const POST = withAuth(async (req: NextRequest) => {
  try { return NextResponse.json(await prisma.download.create({ data: await req.json() }), { status: 201 }) }
  catch { return NextResponse.json({ error: '创建下载项失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

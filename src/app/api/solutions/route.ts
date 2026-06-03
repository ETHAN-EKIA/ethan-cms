import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async () => {
  return NextResponse.json(await withRetry(() => prisma.solution.findMany({ orderBy: { sortOrder: 'asc' } })))
})

export const POST = withAuth(async (req: NextRequest) => {
  try { return NextResponse.json(await prisma.solution.create({ data: await req.json() }), { status: 201 }) }
  catch { return NextResponse.json({ error: '创建解决方案失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { getPublicCorsHeaders } from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, { headers: getPublicCorsHeaders(origin) })
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  const corsHeaders = getPublicCorsHeaders(origin)
  try {
    const categories = await withRetry(() => prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' }
    }))
    return NextResponse.json(categories, { headers: corsHeaders })
  } catch (error) {
    console.error('[Public Categories] Error:', error)
    return NextResponse.json({ error: '获取分类失败' }, { status: 503, headers: corsHeaders })
  }
}

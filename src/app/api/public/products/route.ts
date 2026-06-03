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
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = { status: 'ACTIVE' }
    if (categoryId) where.categoryId = categoryId
    if (search) {
      where.OR = [
        { slug: { contains: search } },
        { brand: { contains: search } }
      ]
    }

    const products = await withRetry(() => prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { sortOrder: 'asc' }
    }))

    return NextResponse.json(products, { headers: corsHeaders })
  } catch (error) {
    console.error('[Public Products] Error:', error)
    return NextResponse.json({ error: '获取产品失败' }, { status: 503, headers: corsHeaders })
  }
}

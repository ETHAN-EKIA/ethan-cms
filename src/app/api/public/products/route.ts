import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { getPublicCorsHeaders } from '@/lib/cors'
import { resolveImageUrlsList, getCmsOrigin } from '@/lib/url-resolver'

export const dynamic = 'force-dynamic'

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, { headers: getPublicCorsHeaders(origin) })
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  const corsHeaders = getPublicCorsHeaders(origin)
  const cmsOrigin = getCmsOrigin(req)
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search') || ''
    const page = Math.min(Math.max(parseInt(searchParams.get('page') || '1'), 1), 100)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100)

    const where: Record<string, unknown> = { status: 'ACTIVE' }
    if (categoryId) where.categoryId = categoryId
    if (search) {
      where.OR = [
        { slug: { contains: search } },
        { brand: { contains: search } }
      ]
    }

    const [total, products] = await withRetry(() => Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true, slug: true } } },
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]))

    // 将相对图片 URL 转为绝对 URL，确保外部网站可访问
    const resolvedProducts = resolveImageUrlsList(products, cmsOrigin)

    return NextResponse.json({ data: resolvedProducts, total, page, limit, totalPages: Math.ceil(total / limit) }, { headers: corsHeaders })
  } catch (error) {
    console.error('[Public Products] Error:', error)
    return NextResponse.json({ error: '获取产品失败' }, { status: 503, headers: corsHeaders })
  }
}

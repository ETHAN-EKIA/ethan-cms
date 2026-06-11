import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { getPublicCorsHeaders } from '@/lib/cors'
import { resolveImageUrls, getCmsOrigin } from '@/lib/url-resolver'

export const dynamic = 'force-dynamic'

export async function OPTIONS(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void params
  const origin = req.headers.get('origin')
  return new NextResponse(null, { headers: getPublicCorsHeaders(origin) })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const origin = req.headers.get('origin')
  const corsHeaders = getPublicCorsHeaders(origin)
  const cmsOrigin = getCmsOrigin(req)
  try {
    const product = await withRetry(() =>
      prisma.product.findUnique({
        where: { id, status: 'ACTIVE' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      })
    )

    if (!product) {
      return NextResponse.json({ error: '产品不存在或未上架' }, { status: 404, headers: corsHeaders })
    }

    // 将相对图片 URL 转为绝对 URL，确保外部网站可访问
    const resolved = resolveImageUrls(product, cmsOrigin)

    return NextResponse.json(resolved, { headers: corsHeaders })
  } catch (error) {
    console.error('[Public Product Detail] Error:', error)
    return NextResponse.json({ error: '获取产品详情失败' }, { status: 503, headers: corsHeaders })
  }
}

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
    const [solutions, testimonials, downloads, blogs] = await withRetry(() => Promise.all([
      prisma.solution.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.testimonial.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.download.findMany({ include: { product: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } }),
      prisma.blog.findMany({
        where: { status: 'PUBLISHED' },
        include: { author: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]))

    // 将所有实体的相对图片 URL 转为绝对 URL
    const resolved = {
      solutions: resolveImageUrlsList(solutions, cmsOrigin),
      testimonials: resolveImageUrlsList(testimonials, cmsOrigin),
      downloads,
      blogs: resolveImageUrlsList(blogs, cmsOrigin),
    }

    return NextResponse.json(resolved, { headers: corsHeaders })
  } catch (error) {
    console.error('[Public Content] Error:', error)
    return NextResponse.json({ error: '获取内容失败' }, { status: 503, headers: corsHeaders })
  }
}

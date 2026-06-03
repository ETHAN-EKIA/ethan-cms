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
    const blogs = await withRetry(() => prisma.blog.findMany({
      where: { status: 'PUBLISHED' },
      include: { author: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    }))
    return NextResponse.json(blogs, { headers: corsHeaders })
  } catch (error) {
    console.error('[Public Blogs] Error:', error)
    return NextResponse.json({ error: '获取博客失败' }, { status: 503, headers: corsHeaders })
  }
}

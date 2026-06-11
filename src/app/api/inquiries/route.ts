import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'
import { inquiryLimiter } from '@/lib/rate-limit'
import { securityLog } from '@/lib/security-log'
import { getPublicCorsHeaders } from '@/lib/cors'

/**
 * HTML 实体转义 — 防止存储型 XSS
 * 将所有危险字符转换为 HTML 实体
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status')
  const search = searchParams.get('search') || ''

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
      { country: { contains: search } }
    ]
  }

  const [total, inquiries] = await withRetry(() => Promise.all([
    prisma.inquiry.count({ where }),
    prisma.inquiry.findMany({
      where,
      include: { product: { select: { id: true, name: true, slug: true } }, assignee: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
  ]))

  return NextResponse.json({ data: inquiries, total, page, limit, totalPages: Math.ceil(total / limit) })
})

export const POST = async (req: NextRequest) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getPublicCorsHeaders(origin)

  // CORS预检
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders })
  }

  try {
    // 速率限制 (Redis优先)
    const rawIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const clientIp = rawIp.split(',')[0].trim() || 'unknown'
    const rateCheck = await inquiryLimiter.check(clientIp)
    if (!rateCheck.allowed) {
      securityLog('RATE_LIMITED', req, { type: 'inquiry', ip: clientIp, retryAfterMs: rateCheck.retryAfterMs })
      return NextResponse.json({ error: '提交过于频繁，请稍后再试' }, {
        status: 429,
        headers: { ...corsHeaders, 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) }
      })
    }

    const data = await req.json()

    // 输入验证
    if (!data.name || typeof data.name !== 'string' || data.name.length > 200) {
      securityLog('INPUT_REJECTED', req, { field: 'name', reason: 'invalid' })
      return NextResponse.json({ error: '请填写有效的姓名' }, { status: 400, headers: corsHeaders })
    }
    if (!data.email || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      securityLog('INPUT_REJECTED', req, { field: 'email', reason: 'invalid_format' })
      return NextResponse.json({ error: '请填写有效的邮箱地址' }, { status: 400, headers: corsHeaders })
    }

    // 清理所有字符串输入：HTML实体转义防止XSS + 长度限制
    const sanitizedData = {
      name: escapeHtml(data.name.trim().slice(0, 200)),
      email: data.email.trim().slice(0, 200).toLowerCase(),
      country: escapeHtml((data.country || '').trim().slice(0, 100)),
      company: escapeHtml((data.company || '').trim().slice(0, 200)),
      phone: escapeHtml((data.phone || '').trim().slice(0, 50)),
      whatsapp: escapeHtml((data.whatsapp || '').trim().slice(0, 50)),
      productId: data.productId || null,
      quantity: escapeHtml((data.quantity || '').trim().slice(0, 50)),
      message: escapeHtml((data.message || '').trim().slice(0, 5000))
    }

    const inquiry = await prisma.inquiry.create({ data: sanitizedData })
    return NextResponse.json(inquiry, {
      status: 201,
      headers: corsHeaders
    })
  } catch (error) {
    console.error('Create inquiry error:', error)
    return NextResponse.json({ error: '提交询盘失败，请稍后重试' }, { status: 500, headers: corsHeaders })
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, { headers: getPublicCorsHeaders(origin) })
}

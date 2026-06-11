import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const locale = searchParams.get('locale')
  const where: Record<string, unknown> = {}
  if (locale) where.locale = locale

  const translations = await withRetry(() => prisma.translation.findMany({ where, orderBy: { key: 'asc' } }))
  return NextResponse.json(translations)
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const { key, locale, value } = await req.json()

    // 输入验证
    if (!key || typeof key !== 'string' || key.length > 200) {
      return NextResponse.json({ error: '翻译键无效或过长' }, { status: 400 })
    }
    const validLocales = ['zh', 'en', 'es', 'ru', 'ar', 'fr']
    if (!locale || !validLocales.includes(locale)) {
      return NextResponse.json({ error: `无效的语言代码，仅支持: ${validLocales.join(', ')}` }, { status: 400 })
    }
    if (!value || typeof value !== 'string' || value.length > 10000) {
      return NextResponse.json({ error: '翻译值无效或过长' }, { status: 400 })
    }

    const translation = await prisma.translation.upsert({
      where: { key_locale: { key, locale } },
      update: { value },
      create: { key, locale, value }
    })
    return NextResponse.json(translation, { status: 201 })
  } catch { return NextResponse.json({ error: '保存翻译失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

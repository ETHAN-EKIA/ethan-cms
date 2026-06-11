import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    const allowedFields = ['key', 'locale', 'value']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    if (sanitized.key && (typeof sanitized.key !== 'string' || sanitized.key.length > 200)) {
      return NextResponse.json({ error: '翻译键无效或过长' }, { status: 400 })
    }
    if (sanitized.value && (typeof sanitized.value !== 'string' || sanitized.value.length > 10000)) {
      return NextResponse.json({ error: '翻译值无效或过长' }, { status: 400 })
    }
    const validLocales = ['zh', 'en', 'es', 'ru', 'ar', 'fr']
    if (sanitized.locale && !validLocales.includes(sanitized.locale as string)) {
      return NextResponse.json({ error: '无效的语言代码' }, { status: 400 })
    }

    return NextResponse.json(await prisma.translation.update({ where: { id }, data: sanitized as never }))
  }
  catch { return NextResponse.json({ error: '更新翻译失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.translation.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete translation error:', error)
    return NextResponse.json({ error: '删除翻译失败' }, { status: 400 })
  }
}, ['ADMIN'])

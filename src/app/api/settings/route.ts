import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async () => {
  const settings = await prisma.siteSetting.findMany()
  return NextResponse.json(settings)
})

export const PUT = withAuth(async (req: NextRequest) => {
  try {
    const data = await req.json()

    // 安全修复: 验证输入必须是数组
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: '数据格式无效' }, { status: 400 })
    }

    // 安全修复: 限制每次更新的条目数
    if (data.length > 50) {
      return NextResponse.json({ error: '一次最多更新50个设置项' }, { status: 400 })
    }

    // 安全修复: 验证每个条目的格式
    for (const item of data) {
      if (!item.key || typeof item.key !== 'string' || item.key.length > 100) {
        return NextResponse.json({ error: '设置键格式无效' }, { status: 400 })
      }
    }

    for (const item of data) {
      await prisma.siteSetting.upsert({
        where: { key: item.key },
        update: { value: item.value as object },
        create: { key: item.key, value: item.value as object }
      })
    }
    return NextResponse.json({ message: '设置保存成功' })
  } catch { return NextResponse.json({ error: '保存设置失败' }, { status: 400 }) }
}, ['ADMIN'])

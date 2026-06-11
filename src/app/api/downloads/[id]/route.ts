import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()

    // type 验证
    const validTypes = ['PDF', 'ZIP', 'DOC', 'OTHER']
    if (data.type && !validTypes.includes(data.type)) {
      return NextResponse.json({ error: `无效的文件类型` }, { status: 400 })
    }

    // 字段白名单
    const allowedFields = ['name', 'type', 'fileUrl', 'fileSize', 'version', 'productId', 'sortOrder']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) sanitized[key] = data[key]
    }

    return NextResponse.json(await prisma.download.update({ where: { id }, data: sanitized as never }))
  }
  catch { return NextResponse.json({ error: '更新下载项失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.download.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete download error:', error)
    return NextResponse.json({ error: '删除下载项失败' }, { status: 400 })
  }
}, ['ADMIN'])

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.media.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete media error:', error)
    return NextResponse.json({ error: '删除媒体失败' }, { status: 400 })
  }
}, ['ADMIN'])

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    const data = await req.json()
    return NextResponse.json(await prisma.media.update({ where: { id }, data }))
  } catch { return NextResponse.json({ error: '更新媒体失败' }, { status: 400 }) }
})

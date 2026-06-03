import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try { return NextResponse.json(await prisma.testimonial.update({ where: { id }, data: await req.json() })) }
  catch { return NextResponse.json({ error: '更新客户反馈失败' }, { status: 400 }) }
}, ['ADMIN', 'EDITOR'])

export const DELETE = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  try {
    await prisma.testimonial.delete({ where: { id } })
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('Delete testimonial error:', error)
    return NextResponse.json({ error: '删除客户反馈失败' }, { status: 400 })
  }
}, ['ADMIN'])

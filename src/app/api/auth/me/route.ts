import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { id: true, username: true, email: true, displayName: true, role: true, avatar: true, createdAt: true }
  })
  if (!dbUser) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }
  return NextResponse.json(dbUser)
})

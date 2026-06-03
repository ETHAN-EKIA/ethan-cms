import { NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { withAuth } from '@/lib/middleware'

export const GET = withAuth(async () => {
  const [productCount, inquiryCount, customerCount, orderCount, recentInquiries, inquiryByStatus, recentOrders] = await withRetry(() => Promise.all([
    prisma.product.count(),
    prisma.inquiry.count(),
    prisma.customer.count(),
    prisma.order.count(),
    prisma.inquiry.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true } } } }),
    prisma.inquiry.groupBy({ by: ['status'], _count: true }),
    prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true } } } })
  ]))

  return NextResponse.json({
    stats: { productCount, inquiryCount, customerCount, orderCount },
    recentInquiries,
    inquiryByStatus,
    recentOrders
  })
})

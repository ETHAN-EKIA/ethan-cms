import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/**
 * Slug 唯一性校验 API
 *
 * GET /api/products/check-slug?slug=my-product&excludeId=xxx
 * 返回 { available: boolean, suggestion: string }
 */
export async function GET(request: NextRequest) {
  const token =
    request.cookies.get('auth_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    null;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';
  const excludeId = searchParams.get('excludeId') || undefined;

  if (!slug.trim()) {
    return NextResponse.json({ available: false, suggestion: '' });
  }

  const existing = await prisma.product.findFirst({
    where: {
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ available: true, suggestion: slug });
  }

  // 生成唯一建议：追加 -1, -2, -3...
  let counter = 1;
  let suggestion = '';
  while (counter < 100) {
    suggestion = `${slug}-${counter}`;
    const exists = await prisma.product.findFirst({
      where: { slug: suggestion, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!exists) break;
    counter++;
  }

  return NextResponse.json({ available: false, suggestion });
}

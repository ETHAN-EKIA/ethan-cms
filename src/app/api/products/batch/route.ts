import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

/**
 * 批量导入产品 API
 * POST /api/products/batch
 * Body: { products: Record<string, unknown>[] }
 */
export async function POST(request: NextRequest) {
  const token =
    request.cookies.get('auth_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    null
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { products } = body as { products: Record<string, unknown>[] }

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: '产品数据为空' }, { status: 400 })
    }
    if (products.length > 100) {
      return NextResponse.json({ error: '单次最多导入100条' }, { status: 400 })
    }

    const created: string[] = []
    const errors: { index: number; error: string }[] = []

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      try {
        // 校验必填
        const name = p.name as Record<string, string> | undefined
        if (!name?.zh?.trim() && !name?.en?.trim()) {
          errors.push({ index: i, error: '产品名称不能为空' })
          continue
        }

        const slug = (p.slug as string) || (name?.en || name?.zh || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

        // 检查 slug 唯一性
        const exists = await prisma.product.findUnique({ where: { slug }, select: { id: true } })
        const finalSlug = exists ? `${slug}-${Date.now()}` : slug

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productData: any = {
        slug: finalSlug,
        sku: p.sku || undefined,
        categoryId: p.categoryId || undefined,
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        moq: Number(p.moq) || 1,
        brand: p.brand || undefined,
        badge: p.badge || undefined,
        status: (['ACTIVE','DRAFT','INACTIVE'].includes(p.status as string) ? p.status : 'DRAFT'),
        name: p.name || { zh: '', en: '', es: '' },
        summary: p.summary || undefined,
        highlights: p.highlights || undefined,
        details: p.details || undefined,
        seoTitle: p.seoTitle || undefined,
        seoDesc: p.seoDesc || undefined,
        seoKeywords: p.seoKeywords || undefined,
        logistics: p.logistics || undefined,
      }

      const product = await withRetry(() =>
        prisma.product.create({ data: productData })
        )
        created.push(product.id)
      } catch (e) {
        errors.push({ index: i, error: (e as Error).message || '创建失败' })
      }
    }

    return NextResponse.json({
      created: created.length,
      errors: errors.length > 0 ? errors : undefined,
      ids: created,
    })
  } catch (error) {
    console.error('[Batch Import] Error:', error)
    return NextResponse.json({ error: '批量导入失败' }, { status: 500 })
  }
}

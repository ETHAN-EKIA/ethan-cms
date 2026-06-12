'use client'

import Link from 'next/link'

export interface ProductCardData {
  id: string
  slug: string
  name: Record<string, string>
  sku?: string
  price: number
  moq?: number
  badge?: string
  brand?: string
  summary?: Record<string, string>
  highlights?: Array<Record<string, string>>
  images?: { main?: string; gallery?: string[] }
  category?: { id: string; name: Record<string, string>; slug: string }
}

const BADGE_MAP: Record<string, { label: string; color: string }> = {
  bestseller: { label: '热卖', color: 'bg-red-500' },
  new:        { label: '新品', color: 'bg-blue-500' },
  hot:        { label: '爆款', color: 'bg-red-500' },
  sale:       { label: '促销', color: 'bg-blue-500' },
}

function imgUrl(p: ProductCardData): string {
  const m = p.images?.main
  if (!m) return '/placeholder.svg'
  if (m.startsWith('http')) return m
  return m.startsWith('/') ? m : `/${m}`
}

function nameText(p: ProductCardData): string {
  const n = p.name
  return n?.en || n?.zh || Object.values(n || {})[0] || ''
}

// 1-2 句核心差异卖点（取 summary 前 1-2 句，不含换行）
function sellingPoint(p: ProductCardData): string {
  const s = p.summary
  if (!s) return ''
  const raw = s.zh || s.en || ''
  const first = raw.split(/[。.\n]/)[0]?.trim() || ''
  if (first.length > 60) return first.slice(0, 60) + '…'
  return first
}

// 精简标签：去重并排除与 selling point 重叠的内容
function featureTags(p: ProductCardData, sell: string): string[] {
  const h = p.highlights
  if (!h || !Array.isArray(h)) return []
  return h
    .map(item => (item?.zh || item?.en || '').trim())
    .filter(t => t && !sell.includes(t))
    .slice(0, 3)
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const name = nameText(product)
  const sell = sellingPoint(product)
  const tags = featureTags(product, sell)
  const badgeInfo = product.badge ? BADGE_MAP[product.badge.toLowerCase()] : null
  const catName = product.category?.name?.zh || product.category?.name?.en || ''

  const handleInquiry = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.location.href = `#inquiry?product=${product.id}&name=${encodeURIComponent(name)}`
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* ── 1. 产品图 + 角标 ── */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
        <img
          src={imgUrl(product)}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {badgeInfo && (
          <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[11px] font-semibold text-white ${badgeInfo.color}`}>
            {badgeInfo.label}
          </span>
        )}
        {/* Hover 提示 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs font-medium text-white bg-black/40 px-3 py-1 rounded-full">
            查看详情
          </span>
        </div>
      </div>

      {/* ── 2. 信息区（阅读优先级从上到下）── */}
      <div className="p-4 flex flex-col gap-1.5">
        {/* 分类/系列名 */}
        {catName && (
          <span className="text-[11px] text-gray-400 uppercase tracking-wide">{catName}</span>
        )}

        {/* 产品型号/核心关键词 */}
        <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-cyan-600 transition-colors">
          {name}
        </h3>

        {/* 1-2 句核心差异卖点（与标签互补，不重复） */}
        {sell && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-0.5">
            {sell}
          </p>
        )}

        {/* 精简功能标签（最多 3 个） */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── 3. 价格 + 询价按钮 ── */}
        <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-gray-50">
          <span className="text-sm">
            <span className="text-gray-400 text-xs">起 </span>
            <span className="text-blue-600 font-bold">${Number(product.price).toFixed(2)}</span>
          </span>
          <button
            type="button"
            onClick={handleInquiry}
            className="px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 active:bg-cyan-800 transition-colors shadow-sm"
          >
            询价
          </button>
        </div>
      </div>
    </Link>
  )
}

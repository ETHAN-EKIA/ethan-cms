'use client'

import Link from 'next/link'

export interface ProductCardData {
  id: string; slug: string; name: Record<string, string>; sku?: string
  price: number; moq?: number; badge?: string; brand?: string
  summary?: Record<string, string>; highlights?: Array<Record<string, string>>
  images?: { main?: string; gallery?: string[] }
  category?: { id: string; name: Record<string, string>; slug: string }
}

const BADGE_MAP: Record<string, { label: string; color: string }> = {
  bestseller: { label: '热卖', color: 'bg-[#0066FF]' },
  new:        { label: '新品', color: 'bg-[#0066FF]' },
  hot:        { label: '爆款', color: 'bg-[#0052CC]' },
  sale:       { label: '促销', color: 'bg-[#0066FF]' },
}

/* ── Text hierarchy ──
   L1 title/name:   #111827  deep charcoal, prominent
   L2 body/summary:  #374151  comfortable reading on white
   L3 category/tag:  #6B7280  subdued but clear
   L4 helper/note:   #9CA3AF  de-emphasized
   Accent price:     #0066FF  brand blue
────────────────────────────────────────────── */

function imgUrl(p: ProductCardData): string {
  const m = p.images?.main
  if (!m) return '/placeholder.svg'
  if (m.startsWith('http')) return m
  return m.startsWith('/') ? m : `/${m}`
}
function nameText(p: ProductCardData): string {
  const n = p.name; return n?.en || n?.zh || Object.values(n||{})[0] || ''
}
function sellingPoint(p: ProductCardData): string {
  const s = p.summary; if (!s) return ''
  const raw = s.zh || s.en || ''
  const first = raw.split(/[。.\n]/)[0]?.trim() || ''
  return first.length > 60 ? first.slice(0,60)+'…' : first
}
function featureTags(p: ProductCardData, sell: string): string[] {
  const h = p.highlights; if (!h||!Array.isArray(h)) return []
  return h.map(i=>(i?.zh||i?.en||'').trim()).filter(t=>t&&!sell.includes(t)).slice(0,3)
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const name = nameText(product)
  const sell = sellingPoint(product)
  const tags = featureTags(product, sell)
  const badgeInfo = product.badge ? BADGE_MAP[product.badge.toLowerCase()] : null
  const catName = product.category?.name?.zh || product.category?.name?.en || ''

  const handleInquiry = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    window.location.href = 'https://www.ethscam.com/#contact'
  }

  return (
    <Link href={`/products/${product.id}`}
      className="group block bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl hover:shadow-lg hover:border-[#0066FF]/30 transition-all duration-300 cursor-pointer overflow-hidden">

      {/* 1. Image + Badge */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E5E7EB]">
        <img src={imgUrl(product)} alt={name} loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
        {badgeInfo && (
          <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[11px] font-semibold text-white ${badgeInfo.color}`}>
            {badgeInfo.label}
          </span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs font-medium text-white bg-black/40 px-3 py-1 rounded-full">查看详情</span>
        </div>
      </div>

      {/* 2. Info — 4-level text hierarchy */}
      <div className="p-4 flex flex-col gap-1.5">
        {/* L3: category */}
        {catName && <span className="text-[11px] text-[#6B7280] uppercase tracking-wide">{catName}</span>}
        {/* L1: product name */}
        <h3 className="text-sm font-semibold text-[#111827] leading-snug line-clamp-2 group-hover:text-[#0066FF] transition-colors">{name}</h3>
        {/* L2: selling point — body text */}
        {sell && <p className="text-xs text-[#374151] leading-relaxed line-clamp-2">{sell}</p>}
        {/* L3: feature tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 text-[11px] rounded-full bg-white text-[#6B7280] border border-[#E5E7EB]">{tag}</span>
            ))}
          </div>
        )}
        {/* Accent price + Inquiry */}
        <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-[#E5E7EB]">
          <span className="text-sm"><span className="text-[#9CA3AF] text-xs">起 </span><span className="text-[#0066FF] font-bold">${Number(product.price).toFixed(2)}</span></span>
          <button type="button" onClick={handleInquiry}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0066FF] rounded-lg hover:bg-[#267FFF] active:bg-[#0052CC] transition-colors">
            询价
          </button>
        </div>
      </div>
    </Link>
  )
}

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
  new: { label: '新品', color: 'bg-blue-500' },
  hot: { label: '爆款', color: 'bg-red-500' },
  sale: { label: '促销', color: 'bg-blue-500' },
}

function getImageUrl(product: ProductCardData): string {
  const main = product.images?.main
  if (!main) return '/placeholder.svg'
  if (main.startsWith('http')) return main
  return main.startsWith('/') ? main : `/${main}`
}

function getProductName(product: ProductCardData): string {
  const name = product.name
  return name?.en || name?.zh || Object.values(name || {})[0] || 'Product'
}

function getFeatureTags(product: ProductCardData): string[] {
  const h = product.highlights
  if (!h || !Array.isArray(h)) return []
  return h.slice(0, 3).map(item => item?.en || item?.zh || '').filter(Boolean)
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const name = getProductName(product)
  const tags = getFeatureTags(product)
  const badgeInfo = product.badge ? BADGE_MAP[product.badge.toLowerCase()] : null
  const catName = product.category?.name?.en || product.category?.name?.zh || ''

  const handleInquiry = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const subject = encodeURIComponent(`询价: ${name}`)
    window.location.href = `#inquiry?product=${product.id}&name=${encodeURIComponent(name)}`
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
        <img
          src={getImageUrl(product)}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {/* Badge */}
        {badgeInfo && (
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded text-xs font-semibold text-white ${badgeInfo.color}`}>
            {badgeInfo.label}
          </span>
        )}
        {/* Magnifier icon on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
          <span className="text-white/0 group-hover:text-white/80 transition-all duration-300 text-3xl">🔍</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        {/* Category */}
        {catName && (
          <span className="text-xs text-gray-400 uppercase tracking-wide">{catName}</span>
        )}
        {/* Name */}
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-cyan-600 transition-colors">
          {name}
        </h3>
        {/* Feature Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100">
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Price + Inquiry */}
        <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-50">
          <span className="text-sm">
            <span className="text-gray-400 text-xs">起 </span>
            <span className="text-blue-600 font-bold">${Number(product.price).toFixed(2)}</span>
          </span>
          <button
            type="button"
            onClick={handleInquiry}
            className="px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors shadow-sm"
          >
            询价
          </button>
        </div>
      </div>
    </Link>
  )
}

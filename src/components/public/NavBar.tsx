'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NavBar() {
  const pathname = usePathname()
  const isDetail = pathname.startsWith('/products/') && pathname !== '/products'
  const [lastProduct, setLastProduct] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    // Store last visited product detail
    if (isDetail) {
      const id = pathname.split('/products/')[1]
      const title = document.title || '产品'
      const item = { id, name: title }
      sessionStorage.setItem('lastProduct', JSON.stringify(item))
    }
    // Restore on products list page
    if (!isDetail) {
      const stored = sessionStorage.getItem('lastProduct')
      if (stored) {
        try { setLastProduct(JSON.parse(stored)) } catch { /* ignore */ }
      }
    }
  }, [pathname, isDetail])

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand */}
        <Link
          href="/products"
          className="flex items-center gap-2 text-gray-800 hover:text-cyan-600 transition-colors"
        >
          <span className="text-lg font-bold tracking-tight">ETHAN</span>
          <span className="hidden sm:inline text-xs text-gray-400 font-normal">Security Camera</span>
        </Link>

        {/* Center: Navigation Links */}
        <div className="flex items-center gap-4 text-sm">
          {/* Back to Home */}
          <a
            href="https://www.ethscam.com"
            className="flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
          >
            <span className="text-base">🏠</span>
            <span className="hidden sm:inline">返回主页</span>
          </a>

          {/* Context-specific link */}
          {isDetail ? (
            <Link
              href="/products"
              className="flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
            >
              <span className="text-base">←</span>
              <span className="hidden sm:inline">返回产品列表</span>
            </Link>
          ) : lastProduct ? (
            <Link
              href={`/products/${lastProduct.id}`}
              className="flex items-center gap-1 px-3 py-1.5 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
            >
              <span className="text-base">📄</span>
              <span className="hidden sm:inline truncate max-w-[120px]">上次浏览</span>
            </Link>
          ) : null}

          {/* Inquiry CTA */}
          <a
            href="mailto:sales@ethscam.com"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-sm"
          >
            <span>询价</span>
          </a>
        </div>
      </div>
    </nav>
  )
}

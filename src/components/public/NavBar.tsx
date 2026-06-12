'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NavBar() {
  const pathname = usePathname()
  const isDetail = pathname.startsWith('/products/') && pathname !== '/products'
  const [lastProduct, setLastProduct] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    if (isDetail) {
      const id = pathname.split('/products/')[1]
      try { sessionStorage.setItem('lastProduct', JSON.stringify({ id, name: document.title || '' })) } catch { /* */ }
    }
    if (!isDetail) {
      try {
        const stored = sessionStorage.getItem('lastProduct')
        if (stored) setLastProduct(JSON.parse(stored))
      } catch { /* */ }
    }
  }, [pathname, isDetail])

  const linkClass = "flex items-center gap-1 px-3 py-1.5 text-sm text-[#a8b8cc] hover:text-[#00c8ff] hover:bg-[#1a2330] rounded-lg transition-colors"

  return (
    <nav className="sticky top-0 z-50 bg-[#0c1117]/95 backdrop-blur border-b border-[#2e3c4d]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/products" className="flex items-center gap-2 text-[#f8fbff] hover:text-[#00c8ff] transition-colors">
          <span className="text-lg font-bold tracking-tight">ETHAN</span>
          <span className="hidden sm:inline text-xs text-[#a8b8cc] font-normal">Security Camera</span>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <a href="https://www.ethscam.com" className={linkClass}>🏠 返回主页</a>

          {isDetail ? (
            <Link href="/products" className={linkClass}>← 返回产品列表</Link>
          ) : lastProduct ? (
            <Link href={`/products/${lastProduct.id}`} className={linkClass}>📄 上次浏览</Link>
          ) : null}

          <a href="https://www.ethscam.com/#contact"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0c1117] bg-[#00c8ff] hover:bg-[#2bd4ff] rounded-lg transition-colors shadow-sm">
            询价
          </a>
        </div>
      </div>
    </nav>
  )
}

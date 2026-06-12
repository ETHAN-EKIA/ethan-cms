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
      try { const s = sessionStorage.getItem('lastProduct'); if (s) setLastProduct(JSON.parse(s)) } catch { /* */ }
    }
  }, [pathname, isDetail])

  const navLink = "flex items-center gap-1 px-3 py-1.5 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"

  return (
    <nav className="sticky top-0 z-50 bg-[#001E3C] shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/products" className="flex items-center gap-2 text-white hover:text-white/90 transition-colors">
          <span className="text-lg font-bold tracking-tight">ETHAN</span>
          <span className="hidden sm:inline text-xs text-white/50 font-normal">Security Camera</span>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <a href="https://www.ethscam.com" className={navLink}>🏠 返回主页</a>
          {isDetail ? (
            <Link href="/products" className={navLink}>← 返回产品列表</Link>
          ) : lastProduct ? (
            <Link href={`/products/${lastProduct.id}`} className={navLink}>📄 上次浏览</Link>
          ) : null}
          <a href="https://www.ethscam.com/#contact"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#0066FF] hover:bg-[#267FFF] active:bg-[#0052CC] rounded-lg transition-colors">
            询价
          </a>
        </div>
      </div>
    </nav>
  )
}

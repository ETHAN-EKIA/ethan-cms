import ProductCard, { type ProductCardData } from '@/components/public/ProductCard'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

async function getProducts(): Promise<ProductCardData[]> {
  const heads = await headers()
  const host = heads.get('host') || 'localhost:3001'
  const proto = heads.get('x-forwarded-proto') || 'http'
  const baseUrl = `${proto}://${host}`
  try {
    const res = await fetch(`${baseUrl}/api/public/products?limit=100`, {
      next: { revalidate: 300 }, // ISR: 5分钟缓存
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.data || []
  } catch {
    return []
  }
}

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">安防摄像头</h1>
        <p className="text-sm text-[#5C5C5C] mt-1">{products.length} 款产品</p>
      </section>

      {/* Product Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {products.length === 0 ? (
          <div className="text-center py-20 text-[#5C5C5C]">
            <p className="text-lg">暂无产品</p>
          </div>
        ) : (
          <>
            {/* Responsive Grid: 4-col desktop, 2-col tablet, 1-col mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* "查看全部" Button */}
            {products.length >= 8 && (
              <div className="flex justify-center mt-10">
                <button
                  type="button"
                  className="px-8 py-3 text-sm font-medium text-[#0066FF] bg-white border-2 border-[#0066FF]/20 rounded-full hover:bg-[#F8F9FA] hover:border-[#0066FF]/50 transition-all"
                >
                  查看全部
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer hint */}
      <footer className="text-center py-8 text-xs text-[#5C5C5C]">
        ETHAN Security Camera — Professional Surveillance Solutions
      </footer>
    </div>
  )
}

import ProductCard, { type ProductCardData } from '@/components/public/ProductCard'

export const dynamic = 'force-dynamic'

async function getProducts(): Promise<ProductCardData[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900">安防摄像头</h1>
          <p className="mt-2 text-gray-500">Security Camera Products</p>
        </div>
      </section>

      {/* Product Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
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
                  className="px-8 py-3 text-sm font-medium text-cyan-600 bg-white border-2 border-cyan-200 rounded-full hover:bg-cyan-50 hover:border-cyan-400 transition-all"
                >
                  查看全部
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer hint */}
      <footer className="text-center py-8 text-xs text-gray-400">
        ETHAN Security Camera — Professional Surveillance Solutions
      </footer>
    </div>
  )
}

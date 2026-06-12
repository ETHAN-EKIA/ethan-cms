import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'

interface ProductDetail {
  id: string
  slug: string
  sku?: string
  name: Record<string, string>
  summary?: Record<string, string>
  highlights?: Array<Record<string, string>>
  details?: Array<Array<Record<string, string> | string>>
  images?: { main?: string; gallery?: string[] }
  price: number
  moq?: number
  brand?: string
  badge?: string
  logistics?: Record<string, unknown>
  seoTitle?: Record<string, string>
  seoDesc?: Record<string, string>
  category?: { id: string; name: Record<string, string>; slug: string }
}

export const dynamic = 'force-dynamic'

async function getProduct(id: string): Promise<ProductDetail | null> {
  const heads = await headers()
  const host = heads.get('host') || 'localhost:3001'
  const proto = heads.get('x-forwarded-proto') || 'http'
  const baseUrl = `${proto}://${host}`
  try {
    const res = await fetch(`${baseUrl}/api/public/products/${id}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function getImageUrl(img?: string): string {
  if (!img) return ''
  if (img.startsWith('http')) return img
  return img.startsWith('/') ? img : `/${img}`
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) notFound()

  const name = (product.name as Record<string, string>)?.zh || (product.name as Record<string, string>)?.en || ''
  const nameEn = (product.name as Record<string, string>)?.en || name
  const nameEs = (product.name as Record<string, string>)?.es || nameEn
  const summary = (product.summary as Record<string, string>)?.zh || (product.summary as Record<string, string>)?.en || ''
  const highlights = (product.highlights || []) as Array<Record<string, string>>
  const details = (product.details || []) as Array<Array<Record<string, string> | string>>
  const gallery = (product.images?.gallery || []) as string[]
  const log = (product.logistics || {}) as Record<string, unknown>
  const datasheet = (log?.datasheet as string) || ''
  const moqLog = (log?.moq as Record<string, string>)?.zh || ''
  const leadTime = (log?.leadTime as Record<string, string>)?.zh || ''
  const warranty = (log?.warranty as Record<string, string>)?.zh || ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-400 mb-6">
            <Link href="/products" className="hover:text-cyan-600 transition-colors">产品列表</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-600">{name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={getImageUrl(product.images?.main)}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
              {gallery.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {gallery.slice(0, 4).map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer hover:border-cyan-400 transition-colors">
                      <img src={getImageUrl(url)} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {product.badge && (
                <span className="inline-block px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded">
                  {product.badge === 'bestseller' ? '热卖' : product.badge === 'new' ? '新品' : product.badge === 'hot' ? '爆款' : product.badge === 'sale' ? '促销' : product.badge}
                </span>
              )}
              <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
              {product.brand && <p className="text-gray-500">{product.brand}</p>}

              {/* Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-400">起</span>
                <span className="text-4xl font-bold text-blue-600">${Number(product.price).toFixed(2)}</span>
                {product.moq && product.moq > 1 && <span className="text-sm text-gray-400">/ MOQ: {product.moq}</span>}
              </div>

              {/* Key Highlights */}
              {highlights.filter(h => h.zh?.trim()).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">核心卖点</h3>
                  <ul className="space-y-1.5">
                    {highlights.filter(h => h.zh?.trim()).map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-cyan-500 mt-1">✓</span>
                        <span>{h.zh}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inquiry Button */}
              <button className="w-full sm:w-auto px-8 py-3 bg-cyan-600 text-white font-medium rounded-xl hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-100">
                立即询价
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Details Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Product Summary */}
        {summary && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">产品介绍</h2>
            <p className="text-gray-600 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Specs Table */}
        {details.length > 0 && details.some(row => (row[0] as Record<string, string>)?.zh?.trim()) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">规格参数</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {details.filter(row => (row[0] as Record<string, string>)?.zh?.trim()).map((row, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-b border-gray-100 last:border-0`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 w-1/3">{(row[0] as Record<string, string>)?.zh || ''}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{(row[1] as Record<string, string>)?.zh || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gallery / Scene Photos */}
        {gallery.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">产品实拍 / 场景</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map((url, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  <img src={getImageUrl(url)} alt={`${name} scene ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logistics & Warranty */}
        {(moqLog || leadTime || warranty) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">物流 & 质保</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {moqLog && <div><span className="text-xs text-gray-400 uppercase">MOQ</span><p className="text-lg font-semibold text-gray-800">{moqLog}</p></div>}
              {leadTime && <div><span className="text-xs text-gray-400 uppercase">交货时间</span><p className="text-lg font-semibold text-gray-800">{leadTime}</p></div>}
              {warranty && <div><span className="text-xs text-gray-400 uppercase">质保</span><p className="text-lg font-semibold text-gray-800">{warranty}</p></div>}
            </div>
          </div>
        )}

        {/* Installation Guide */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">安装指南</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '01', title: '选址定位', desc: '选择安装位置，确保摄像头覆盖关键监控区域，避开强光直射和遮挡物。' },
              { step: '02', title: '固定安装', desc: '使用附赠支架和螺丝固定摄像头，确保安装牢固。户外安装建议增加防水处理。' },
              { step: '03', title: '连接配置', desc: '连接电源和网络（PoE/WiFi/4G），扫描二维码或访问 IP 完成初始设置。' },
            ].map((item) => (
              <div key={item.step} className="text-center p-4 rounded-xl bg-gray-50 hover:bg-cyan-50 transition-colors">
                <span className="text-3xl font-bold text-cyan-200">{item.step}</span>
                <h3 className="text-sm font-semibold text-gray-800 mt-2">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          {datasheet && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <a href={datasheet} target="_blank" rel="noopener" className="text-sm text-cyan-600 hover:text-cyan-800 transition-colors">
                📄 下载完整安装手册
              </a>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">常见问题</h2>
          <div className="space-y-4">
            {[
              { q: '如何下单？', a: '点击「立即询价」按钮提交需求，我们的销售团队会在24小时内联系您。' },
              { q: 'MOQ 是多少？', a: `${moqLog || `最小起订量 ${product.moq || 10} 台`}，支持样品测试。` },
              { q: '质保期多久？', a: `${warranty || '标准2年质保'}，可延长至3-5年。` },
              { q: '支持定制吗？', a: '支持 OEM/ODM，包括 LOGO、包装、UI界面、功能模块的深度定制。' },
            ].map((faq, i) => (
              <details key={i} className="group border border-gray-100 rounded-xl p-4 hover:border-cyan-200 transition-colors">
                <summary className="text-sm font-medium text-gray-800 cursor-pointer list-none flex justify-between items-center">
                  {faq.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Back */}
      <footer className="text-center py-8">
        <Link href="/products" className="text-sm text-cyan-600 hover:text-cyan-800 transition-colors">
          ← 返回产品列表
        </Link>
      </footer>
    </div>
  )
}

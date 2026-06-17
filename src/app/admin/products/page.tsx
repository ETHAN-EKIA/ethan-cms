'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiDelete } from '@/lib/api-client'
import Link from 'next/link'

interface Product {
  id: string; slug: string; name: Record<string, string>; price: number; sku: string;
  brand: string; badge: string; status: string; sortOrder: number;
  category?: { id: string; name: Record<string, string> }
  images?: { main: string; gallery: string[] }
  createdAt: string
}
interface ProductList { data: Product[]; total: number; page: number; totalPages: number }

const statusMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '上架', color: 'bg-green-100 text-green-700' },
  DRAFT: { label: '草稿', color: 'bg-yellow-100 text-yellow-700' },
  INACTIVE: { label: '下架', color: 'bg-red-100 text-red-700' },
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const totalPages = Math.ceil(total / 20)

  const load = () => {
    setLoading(true)
    apiGet<ProductList>(`/products?page=${page}&limit=20&search=${encodeURIComponent(search)}`)
      .then(d => { setProducts(d.data); setTotal(d.total) })
      .catch(console.error).finally(() => setLoading(false))
  }

  // Debounce search: wait 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => { load() }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [page, search])

  // 从编辑页返回时自动刷新数据（Next.js 路由缓存不会重新触发 useEffect）
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisibility)
    // 监听 Next.js App Router 的导航事件（从编辑页 router.push 回来时触发）
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [page, search])

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此产品？')) return
    try {
      await apiDelete(`/products/${id}`)
      load()
    } catch (e: unknown) {
      alert((e as Error).message || '删除失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">产品管理</h1>
        <Link href="/admin/products/new" className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">+ 新增产品</Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex gap-3">
          <input type="text" placeholder="搜索 SKU / 品牌 / slug..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="p-3 font-medium">图片</th><th className="p-3 font-medium">产品名称</th>
              <th className="p-3 font-medium">SKU</th><th className="p-3 font-medium">分类</th>
              <th className="p-3 font-medium">价格</th><th className="p-3 font-medium">状态</th>
              <th className="p-3 font-medium">操作</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-8 text-center text-gray-400">加载中...</td></tr>}
              {!loading && products.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">暂无产品</td></tr>}
              {products.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400 overflow-hidden">
                      {p.images?.main ? <img src={p.images.main.startsWith('/') ? p.images.main : `/${p.images.main}`} className="w-full h-full object-cover" /> : '📷'}
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{p.name?.en || p.name?.zh || '-'}</p>
                    <p className="text-xs text-gray-400">{p.name?.zh}</p>
                  </td>
                  <td className="p-3 font-mono text-xs">{p.sku || '-'}</td>
                  <td className="p-3 text-xs">{p.category?.name?.en || '-'}</td>
                  <td className="p-3">${Number(p.price).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusMap[p.status]?.color || 'bg-gray-100'}`}>
                      {statusMap[p.status]?.label || p.status}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    <Link href={`/admin/products/${p.id}/edit`} className="text-cyan-600 hover:underline text-xs">编辑</Link>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm text-gray-500">共 {total} 条</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">上一页</button>
              <span className="px-3 py-1 text-sm">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">下一页</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

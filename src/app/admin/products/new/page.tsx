'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/api-client'
import ProductForm from '@/components/admin/ProductForm'
import ImportModal from '@/components/admin/ImportModal'

interface Category { id: string; name: Record<string, string>; slug: string }

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importData, setImportData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => { apiGet<Category[]>('/categories').then(setCategories).catch(console.error) }, [])

  const handleSubmit = async (data: Record<string, unknown>) => {
    setError('')
    try {
      await apiPost('/products', data)
      router.push('/admin/products')
    } catch (e: unknown) {
      const msg = (e as Error).message || '创建产品失败'
      setError(msg)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBatchImport = async (rows: Record<string, unknown>[]) => {
    setError('')
    try {
      const res = await fetch('/api/products/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: rows }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '批量导入失败')
      alert(`批量导入完成：成功 ${data.created || 0} 条`)
      router.push('/admin/products')
    } catch (e: unknown) {
      throw new Error((e as Error).message || '批量导入失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">新增产品</h1>
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0066FF] bg-[#0066FF]/5 border border-[#0066FF]/20 rounded-xl hover:bg-[#0066FF]/10 transition-colors"
        >
          📊 上传表格导入
        </button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      <ProductForm
        key={importData ? JSON.stringify(importData).slice(0, 50) : 'new'}
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="创建产品"
        importedData={importData}
      />

      {showImport && (
        <ImportModal
          onFill={(data) => { setImportData(data); setShowImport(false) }}
          onBatchImport={handleBatchImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/api-client'
import ProductForm from '@/components/admin/ProductForm'

interface Category { id: string; name: Record<string, string>; slug: string }

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">新增产品</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <ProductForm categories={categories} onSubmit={handleSubmit} submitLabel="创建产品" />
    </div>
  )
}

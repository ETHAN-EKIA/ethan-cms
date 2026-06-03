'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiGet, apiPut } from '@/lib/api-client'
import ProductForm from '@/components/admin/ProductForm'

interface Category { id: string; name: Record<string, string>; slug: string }

export default function EditProductPage() {
  const router = useRouter()
  const { id } = useParams()
  const [product, setProduct] = useState<Record<string, unknown> | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGet<Record<string, unknown>>(`/products/${id}`),
      apiGet<Category[]>('/categories')
    ]).then(([p, c]) => { setProduct(p); setCategories(c) })
      .catch(console.error).finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (data: Record<string, unknown>) => {
    await apiPut(`/products/${id}`, data)
    router.push('/admin/products')
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" /></div>
  if (!product) return <div className="text-center py-20 text-gray-500">产品不存在</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">编辑产品</h1>
      <ProductForm initialData={product} categories={categories} onSubmit={handleSubmit} submitLabel="保存修改" />
    </div>
  )
}

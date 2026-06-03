'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/api-client'
import ProductForm from '@/components/admin/ProductForm'

interface Category { id: string; name: Record<string, string>; slug: string }

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => { apiGet<Category[]>('/categories').then(setCategories).catch(console.error) }, [])

  const handleSubmit = async (data: Record<string, unknown>) => {
    await apiPost('/products', data)
    router.push('/admin/products')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">新增产品</h1>
      <ProductForm categories={categories} onSubmit={handleSubmit} submitLabel="创建产品" />
    </div>
  )
}

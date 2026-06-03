'use client'

import { useState } from 'react'

interface Category { id: string; name: Record<string, string>; slug: string }

interface ProductFormProps {
  initialData?: Record<string, unknown>
  categories: Category[]
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  submitLabel: string
}

const langs = [{ key: 'zh', label: '中文' }, { key: 'en', label: 'English' }, { key: 'es', label: 'Español' }]

export default function ProductForm({ initialData, categories, onSubmit, submitLabel }: ProductFormProps) {
  const [lang, setLang] = useState('en')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    slug: (initialData?.slug as string) || '',
    sku: (initialData?.sku as string) || '',
    categoryId: (initialData?.categoryId as string) || '',
    price: Number(initialData?.price) || 0,
    stock: Number(initialData?.stock) || 0,
    moq: Number(initialData?.moq) || 1,
    brand: (initialData?.brand as string) || '',
    badge: (initialData?.badge as string) || '',
    status: (initialData?.status as string) || 'ACTIVE',
    sortOrder: Number(initialData?.sortOrder) || 0,
    name: (initialData?.name as Record<string, string>) || { zh: '', en: '', es: '' },
    summary: (initialData?.summary as Record<string, string>) || { zh: '', en: '', es: '' },
    highlights: (initialData?.highlights as Array<Record<string, string>>) || [{ zh: '', en: '', es: '' }],
    details: (initialData?.details as Array<Array<Record<string, string> | string>>) || [[{ zh: '', en: '', es: '' }, { zh: '', en: '', es: '' }]],
    images: (initialData?.images as { main: string; gallery: string[] }) || { main: '', gallery: [] },
    seoTitle: (initialData?.seoTitle as string) || '',
    seoDesc: (initialData?.seoDesc as string) || '',
    seoKeywords: (initialData?.seoKeywords as string) || '',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value } as any))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateLang = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: { ...(prev as any)[field] as Record<string, string>, [lang]: value } } as any))

  const addHighlight = () => setForm(prev => ({ ...prev, highlights: [...prev.highlights, { zh: '', en: '', es: '' }] }))
  const removeHighlight = (i: number) => setForm(prev => ({ ...prev, highlights: prev.highlights.filter((_, idx) => idx !== i) }))
  const updateHighlight = (i: number, v: string) => setForm(prev => {
    const h = [...prev.highlights]; h[i] = { ...h[i], [lang]: v }; return { ...prev, highlights: h }
  })

  const addDetail = () => setForm(prev => ({ ...prev, details: [...prev.details, [{ zh: '', en: '', es: '' }, { zh: '', en: '', es: '' }]] }))
  const removeDetail = (i: number) => setForm(prev => ({ ...prev, details: prev.details.filter((_, idx) => idx !== i) }))
  const updateDetail = (i: number, j: number, v: string) => setForm(prev => {
    const d = prev.details.map(row => [...row]);
    const cell = d[i][j] as Record<string, string>
    d[i][j] = { ...cell, [lang]: v }
    return { ...prev, details: d }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await onSubmit(form as unknown as Record<string, unknown>) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Language Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {langs.map(l => (
          <button key={l.key} type="button" onClick={() => setLang(l.key)}
            className={`px-4 py-2 text-sm rounded-t-lg ${lang === l.key ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">基本信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm text-gray-600 mb-1">产品名称 ({lang})</label>
            <input value={(form.name as Record<string, string>)[lang] || ''} onChange={e => updateLang('name', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">Slug</label>
            <input value={form.slug} onChange={e => update('slug', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required /></div>
          <div><label className="block text-sm text-gray-600 mb-1">SKU</label>
            <input value={form.sku} onChange={e => update('sku', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">品牌</label>
            <input value={form.brand} onChange={e => update('brand', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">分类</label>
            <select value={form.categoryId} onChange={e => update('categoryId', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">选择分类</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name.en || c.name.zh}</option>)}
            </select></div>
          <div><label className="block text-sm text-gray-600 mb-1">价格 (USD)</label>
            <input type="number" step="0.01" value={form.price} onChange={e => update('price', parseFloat(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">库存</label>
            <input type="number" value={form.stock} onChange={e => update('stock', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">MOQ</label>
            <input type="number" value={form.moq} onChange={e => update('moq', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">标签</label>
            <select value={form.badge} onChange={e => update('badge', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">无</option><option value="bestseller">Bestseller</option><option value="new">New</option><option value="hot">Hot</option><option value="sale">Sale</option>
            </select></div>
          <div><label className="block text-sm text-gray-600 mb-1">状态</label>
            <select value={form.status} onChange={e => update('status', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="ACTIVE">上架</option><option value="DRAFT">草稿</option><option value="INACTIVE">下架</option>
            </select></div>
        </div>
        <div><label className="block text-sm text-gray-600 mb-1">产品简介 ({lang})</label>
          <textarea value={(form.summary as Record<string, string>)[lang] || ''} onChange={e => updateLang('summary', e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
      </div>

      {/* Highlights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="font-semibold text-gray-800">产品亮点</h2>
          <button type="button" onClick={addHighlight} className="text-sm text-cyan-600 hover:underline">+ 添加亮点</button>
        </div>
        {form.highlights.map((h, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={h[lang] || ''} onChange={e => updateHighlight(i, e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder={`亮点 ${i + 1}`} />
            <button type="button" onClick={() => removeHighlight(i)} className="text-red-500 text-sm">删除</button>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="font-semibold text-gray-800">规格参数</h2>
          <button type="button" onClick={addDetail} className="text-sm text-cyan-600 hover:underline">+ 添加参数</button>
        </div>
        {form.details.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={(row[0] as Record<string, string>)[lang] || ''} onChange={e => updateDetail(i, 0, e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="参数名" />
            <input value={(row[1] as Record<string, string>)[lang] || ''} onChange={e => updateDetail(i, 1, e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="参数值" />
            <button type="button" onClick={() => removeDetail(i)} className="text-red-500 text-sm">删除</button>
          </div>
        ))}
      </div>

      {/* Images */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">图片</h2>
        <div><label className="block text-sm text-gray-600 mb-1">主图路径</label>
          <input value={form.images.main} onChange={e => update('images', { ...form.images, main: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="/uploads/products/image.jpg" /></div>
      </div>

      {/* SEO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">SEO</h2>
        <div><label className="block text-sm text-gray-600 mb-1">SEO 标题</label>
          <input value={form.seoTitle} onChange={e => update('seoTitle', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        <div><label className="block text-sm text-gray-600 mb-1">SEO 描述</label>
          <textarea value={form.seoDesc} onChange={e => update('seoDesc', e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        <div><label className="block text-sm text-gray-600 mb-1">SEO 关键词</label>
          <input value={form.seoKeywords} onChange={e => update('seoKeywords', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="keyword1, keyword2" /></div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="bg-cyan-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50">
          {loading ? '保存中...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

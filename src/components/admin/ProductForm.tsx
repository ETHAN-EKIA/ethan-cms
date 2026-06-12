'use client'

import { useState, useRef, useCallback } from 'react'

interface Category { id: string; name: Record<string, string>; slug: string }

interface ProductFormProps {
  initialData?: Record<string, unknown>
  categories: Category[]
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  submitLabel: string
}

const langs = [
  { key: 'zh', label: '中文' },
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Español' },
] as const

type LangKey = (typeof langs)[number]['key']

// ── 工具函数 ──
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/[一-鿿]/g, '')
    .replace(/-+/g, '-')
    .substring(0, 80)
}

function generateSeoTitle(name: Record<string, string>, brand: string): string {
  const base = name.en || name.zh || ''
  const suffix = brand ? ` - ${brand}` : ' - ETHAN Security Camera'
  return `${base}${suffix}`.substring(0, 120)
}

function generateSeoDesc(summary: Record<string, string>, name: Record<string, string>): string {
  const base = summary.en || summary.zh || name.en || name.zh || ''
  return `${base}。High quality security camera for home and business.`.substring(0, 300)
}

function generateSeoKeywords(name: Record<string, string>, categoryName: string): string {
  const parts: string[] = []
  const n = name.en || name.zh || ''
  if (n) parts.push(n)
  if (categoryName) parts.push(categoryName)
  parts.push('security camera', 'CCTV', 'surveillance', 'ETHAN')
  return parts.join(', ')
}

// ── 检测是否需要翻译 ──
function needsTranslation(name: Record<string, string>, summary: Record<string, string>, highlights: Array<Record<string, string>>): boolean {
  const hasZh = name.zh?.trim() || summary.zh?.trim()
  const hasEn = name.en?.trim() || summary.en?.trim()
  const hasEs = name.es?.trim() || summary.es?.trim()
  return !!hasZh && (!hasEn || !hasEs)
}

// ── 图片上传组件 ──
function ImageUploader({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'products')
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上传失败')
      onChange(data.url)
    } catch (e) {
      alert((e as Error).message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <div className="flex gap-3 items-start">
        <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
          {value ? <img src={value.startsWith('/') || value.startsWith('http') ? value : `/${value}`} className="w-full h-full object-cover" /> : <span className="text-gray-400 text-2xl">📷</span>}
        </div>
        <div className="flex-1 space-y-2">
          <input value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="/uploads/products/image.jpg" />
          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50">
              {uploading ? '上传中...' : '选择文件上传'}
            </button>
            {value && <button type="button" onClick={() => onChange('')} className="px-3 py-1.5 bg-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-300">清除</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = '' }} />
        </div>
      </div>
    </div>
  )
}

function GalleryUploader({ onAdd }: { onAdd: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (files: FileList) => {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', 'products')
        const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `文件 ${file.name} 上传失败`)
        onAdd(data.url)
      }
    } catch (e) {
      alert((e as Error).message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="px-3 py-1.5 border-2 border-dashed border-gray-300 text-gray-500 text-sm rounded-lg hover:border-cyan-400 hover:text-cyan-600 disabled:opacity-50">
        {uploading ? '上传中...' : '+ 上传图片到 Gallery'}
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = '' }} />
    </div>
  )
}

// ── 主表单组件 ──
export default function ProductForm({ initialData, categories, onSubmit, submitLabel }: ProductFormProps) {
  const [lang, setLang] = useState<LangKey>('zh')
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [slugAuto, setSlugAuto] = useState(true)

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
    logistics: (initialData?.logistics as Record<string, unknown>) || { moq: '', leadTime: '', warranty: '', datasheet: '' },
  })

  // 获取分类名
  const getCategoryName = useCallback(() => {
    const cat = categories.find(c => c.id === form.categoryId)
    return cat ? (cat.name.en || cat.name.zh || '') : ''
  }, [categories, form.categoryId])

  // ── 核心：更新表单字段，同时自动生成 SEO ──
  const update = useCallback((field: string, value: unknown) => {
    setForm(prev => {
      const next = { ...prev, [field]: value } as typeof prev

      // Slug 自动生成
      if (field === 'name' && slugAuto) {
        const names = value as Record<string, string>
        const source = names.en || names.zh || ''
        if (source.trim()) next.slug = generateSlug(source)
      }

      // SEO 自动生成
      if (field === 'name' || field === 'summary' || field === 'brand' || field === 'categoryId') {
        const nameData = field === 'name' ? (value as Record<string, string>) : prev.name
        const summaryData = field === 'summary' ? (value as Record<string, string>) : prev.summary
        const brandVal = field === 'brand' ? (value as string) : prev.brand
        const catName = getCategoryName()

        if (!prev.seoTitle?.trim() || field === 'name') {
          next.seoTitle = generateSeoTitle(nameData, brandVal)
        }
        if (!prev.seoDesc?.trim() || field === 'summary') {
          next.seoDesc = generateSeoDesc(summaryData, nameData)
        }
        if (!prev.seoKeywords?.trim() || field === 'name' || field === 'categoryId') {
          next.seoKeywords = generateSeoKeywords(nameData, catName)
        }
      }

      return next
    })
  }, [slugAuto, getCategoryName])

  const updateLang = useCallback((field: string, value: string) => {
    setForm(prev => {
      const current = (prev as Record<string, unknown>)[field] as Record<string, string>
      const updated = { ...current, [lang]: value }
      const next = { ...prev, [field]: updated } as typeof prev

      // Slug 自动生成
      if (field === 'name' && slugAuto) {
        const source = lang === 'en' ? value : (current.en || value)
        if (source.trim()) next.slug = generateSlug(source)
      }

      // SEO 自动生成
      if (field === 'name' || field === 'summary') {
        const nameData = field === 'name' ? updated : prev.name
        const summaryData = field === 'summary' ? updated : prev.summary
        next.seoTitle = generateSeoTitle(nameData, prev.brand)
        next.seoDesc = generateSeoDesc(summaryData, nameData)
        next.seoKeywords = generateSeoKeywords(nameData, getCategoryName())
      }

      return next
    })
  }, [lang, slugAuto, getCategoryName])

  // ── 自动翻译（静默模式，用于保存时自动填充） ──
  const autoTranslateSilent = useCallback(async (currentForm: typeof form) => {
    const texts: string[] = []
    const fields: string[] = []

    // 收集需要翻译的中文内容
    const nameZh = (currentForm.name as Record<string, string>).zh?.trim()
    const summaryZh = (currentForm.summary as Record<string, string>).zh?.trim()

    if (nameZh && (!currentForm.name.en?.trim() || !currentForm.name.es?.trim())) {
      texts.push(nameZh)
      fields.push('name')
    }
    if (summaryZh && (!currentForm.summary.en?.trim() || !currentForm.summary.es?.trim())) {
      texts.push(summaryZh)
      fields.push('summary')
    }
    currentForm.highlights.forEach((h, i) => {
      if (h.zh?.trim() && (!h.en?.trim() || !h.es?.trim())) {
        texts.push(h.zh)
        fields.push(`highlight_${i}`)
      }
    })

    if (texts.length === 0) return currentForm

    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, from: 'zh', to: ['en', 'es'] }),
      credentials: 'include',
    })

    if (!res.ok) return currentForm

    const data = await res.json() as { translations: string[][] }
    const next = { ...currentForm }
    const nameData = { ...(next.name as Record<string, string>) }
    const summaryData = { ...(next.summary as Record<string, string>) }
    const newHighlights = next.highlights.map(h => ({ ...h }))

    fields.forEach((field, idx) => {
      const enText = data.translations[idx]?.[0] || ''
      const esText = data.translations[idx]?.[1] || ''

      if (field === 'name') {
        if (!nameData.en?.trim()) nameData.en = enText
        if (!nameData.es?.trim()) nameData.es = esText
      } else if (field === 'summary') {
        if (!summaryData.en?.trim()) summaryData.en = enText
        if (!summaryData.es?.trim()) summaryData.es = esText
      } else if (field.startsWith('highlight_')) {
        const hi = parseInt(field.split('_')[1])
        if (newHighlights[hi]) {
          if (!newHighlights[hi].en?.trim()) newHighlights[hi].en = enText
          if (!newHighlights[hi].es?.trim()) newHighlights[hi].es = esText
        }
      }
    })

    next.name = nameData
    next.summary = summaryData
    next.highlights = newHighlights

    // 自动更新 SEO（用翻译后的英文）
    next.seoTitle = generateSeoTitle(nameData, next.brand)
    next.seoDesc = generateSeoDesc(summaryData, nameData)
    next.seoKeywords = generateSeoKeywords(nameData, getCategoryName())

    // 自动更新 slug
    if (slugAuto && nameData.en?.trim()) {
      next.slug = generateSlug(nameData.en)
    }

    return next
  }, [slugAuto, getCategoryName])

  // ── 手动翻译按钮（预览用） ──
  const handleManualTranslate = useCallback(async () => {
    const nameZh = (form.name as Record<string, string>).zh
    if (!nameZh.trim()) {
      alert('请先在中文版面填写产品名称')
      return
    }
    setTranslating(true)
    try {
      const translated = await autoTranslateSilent(form)
      setForm(translated)
    } catch (e) {
      alert((e as Error).message || '翻译失败')
    } finally {
      setTranslating(false)
    }
  }, [form, autoTranslateSilent])

  // ── 提交：自动翻译后保存 ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 如果英文/西班牙语为空，自动翻译
      let finalForm = form
      if (needsTranslation(
        form.name as Record<string, string>,
        form.summary as Record<string, string>,
        form.highlights
      )) {
        finalForm = await autoTranslateSilent(form)
        setForm(finalForm) // 更新UI
      }

      await onSubmit(finalForm as unknown as Record<string, unknown>)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Language Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 items-center justify-between">
        <div className="flex gap-2">
          {langs.map(l => (
            <button key={l.key} type="button" onClick={() => setLang(l.key)}
              className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${lang === l.key ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {l.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleManualTranslate}
          disabled={translating}
          className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
          title="根据中文内容自动翻译为英文和西班牙语"
        >
          {translating ? '⏳ 翻译中...' : '🌐 自动翻译'}
        </button>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">基本信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              产品名称 ({lang === 'zh' ? '中文' : lang === 'en' ? 'English' : 'Español'})
            </label>
            <input
              value={(form.name as Record<string, string>)[lang] || ''}
              onChange={e => updateLang('name', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder={lang === 'zh' ? '输入中文产品名称，英文和西班牙语将自动翻译' : 'Product name (auto-translated if empty)'}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Slug {slugAuto && <span className="text-cyan-600 text-xs">(自动)</span>}
            </label>
            <div className="flex gap-2">
              <input value={form.slug} onChange={e => { setSlugAuto(false); update('slug', e.target.value) }}
                className="flex-1 px-3 py-2 border rounded-lg text-sm" required />
              <button type="button" onClick={() => setSlugAuto(!slugAuto)}
                className={`px-3 py-2 text-xs rounded-lg border ${slugAuto ? 'bg-cyan-50 border-cyan-300 text-cyan-700' : 'bg-gray-50 border-gray-300 text-gray-600'}`}>
                {slugAuto ? '自动 ✓' : '手动'}
              </button>
            </div>
          </div>
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
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            产品简介 ({lang === 'zh' ? '中文' : lang === 'en' ? 'English' : 'Español'})
          </label>
          <textarea value={(form.summary as Record<string, string>)[lang] || ''}
            onChange={e => updateLang('summary', e.target.value)} rows={3}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      {/* Highlights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="font-semibold text-gray-800">产品亮点</h2>
          <button type="button" onClick={addHighlight} className="text-sm text-cyan-600 hover:underline">+ 添加亮点</button>
        </div>
        {form.highlights.map((h, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={h[lang] || ''} onChange={e => updateHighlight(i, e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder={`亮点 ${i + 1}`} />
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
            <input value={(row[0] as Record<string, string>)[lang] || ''} onChange={e => updateDetail(i, 0, e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="参数名" />
            <input value={(row[1] as Record<string, string>)[lang] || ''} onChange={e => updateDetail(i, 1, e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="参数值" />
            <button type="button" onClick={() => removeDetail(i)} className="text-red-500 text-sm">删除</button>
          </div>
        ))}
      </div>

      {/* Images */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">图片</h2>
        <ImageUploader label="主图" value={form.images.main}
          onChange={(url) => update('images', { ...form.images, main: url })} />
        <div>
          <label className="block text-sm text-gray-600 mb-2">图片库 (Gallery)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
            {form.images.gallery.map((url, i) => (
              <div key={i} className="relative group border border-gray-200 rounded-lg overflow-hidden aspect-square bg-gray-50">
                {url ? <img src={url.startsWith('/') || url.startsWith('http') ? url : `/${url}`} className="w-full h-full object-cover" />
                  : <div className="flex items-center justify-center h-full text-gray-400">📷</div>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => {
                    const g = [...form.images.gallery]; g.splice(i, 1);
                    update('images', { ...form.images, gallery: g })
                  }} className="bg-red-500 text-white text-xs px-2 py-1 rounded">删除</button>
                </div>
              </div>
            ))}
          </div>
          <GalleryUploader onAdd={(url) => update('images', { ...form.images, gallery: [...form.images.gallery, url] })} />
        </div>
      </div>

      {/* SEO — 自动生成，仍可手动编辑 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">
          SEO <span className="text-cyan-600 text-xs font-normal">(根据产品名称和简介自动生成)</span>
        </h2>
        <div><label className="block text-sm text-gray-600 mb-1">SEO 标题</label>
          <input value={form.seoTitle} onChange={e => update('seoTitle', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50" /></div>
        <div><label className="block text-sm text-gray-600 mb-1">SEO 描述</label>
          <textarea value={form.seoDesc} onChange={e => update('seoDesc', e.target.value)} rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50" /></div>
        <div><label className="block text-sm text-gray-600 mb-1">SEO 关键词</label>
          <input value={form.seoKeywords} onChange={e => update('seoKeywords', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50" /></div>
      </div>

      {/* Logistics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">物流信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm text-gray-600 mb-1">MOQ ({lang === 'zh' ? '中文' : lang === 'en' ? 'English' : 'Español'})</label>
            <input value={((form.logistics as Record<string, unknown>)?.moq as Record<string, string>)?.[lang] || ''} onChange={e => {
              const cur = (form.logistics as Record<string, unknown>)?.moq as Record<string, string> || { zh: '', en: '', es: '' };
              update('logistics', { ...form.logistics, moq: { ...cur, [lang]: e.target.value } });
            }} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="10 pcs" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">交货时间 ({lang === 'zh' ? '中文' : lang === 'en' ? 'English' : 'Español'})</label>
            <input value={((form.logistics as Record<string, unknown>)?.leadTime as Record<string, string>)?.[lang] || ''} onChange={e => {
              const cur = (form.logistics as Record<string, unknown>)?.leadTime as Record<string, string> || { zh: '', en: '', es: '' };
              update('logistics', { ...form.logistics, leadTime: { ...cur, [lang]: e.target.value } });
            }} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="7-15 days" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">质保 ({lang === 'zh' ? '中文' : lang === 'en' ? 'English' : 'Español'})</label>
            <input value={((form.logistics as Record<string, unknown>)?.warranty as Record<string, string>)?.[lang] || ''} onChange={e => {
              const cur = (form.logistics as Record<string, unknown>)?.warranty as Record<string, string> || { zh: '', en: '', es: '' };
              update('logistics', { ...form.logistics, warranty: { ...cur, [lang]: e.target.value } });
            }} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="2 years" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">规格书文件</label>
            <input value={((form.logistics as Record<string, unknown>)?.datasheet as string) || ''} onChange={e => {
              update('logistics', { ...form.logistics, datasheet: e.target.value });
            }} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="/downloads/product.pdf" /></div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 items-center">
        {loading && (
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <span className="inline-block w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            正在翻译并保存...
          </span>
        )}
        <button type="submit" disabled={loading}
          className="bg-cyan-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50 transition-colors">
          {loading ? '保存中...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

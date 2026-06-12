'use client'

import { useState, useRef, useCallback } from 'react'

// ── Types ──
interface Category { id: string; name: Record<string, string>; slug: string }
interface ProductFormProps {
  initialData?: Record<string, unknown>
  categories: Category[]
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  submitLabel: string
}

type LangKey = 'zh' | 'en' | 'es'
const LANGS: { key: LangKey; label: string }[] = [
  { key: 'zh', label: '中文' },
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Español' },
]

const SEO_MAX = { title: 120, desc: 300, keywords: 200 }
const BRAND_TAGLINE = 'ETHAN Security Camera'

// ── Utilities ──
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-+|-+$/g, '').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').substring(0, 80)
}

function buildSeoObj(name: Record<string, string>, summary: Record<string, string>, brand: string, cat: string, lang: LangKey): { title: Record<string,string>; desc: Record<string,string>; kw: Record<string,string> } {
  const title: Record<string,string> = { zh:'', en:'', es:'' }
  const desc: Record<string,string> = { zh:'', en:'', es:'' }
  const kw: Record<string,string> = { zh:'', en:'', es:'' }
  const suffix = brand ? ` - ${brand}` : ` - ${BRAND_TAGLINE}`
  for (const l of ['zh','en','es'] as LangKey[]) {
    const n = name[l] || name.en || name.zh || ''
    const s = summary[l] || summary.en || summary.zh || n
    title[l] = `${n}${suffix}`.substring(0, SEO_MAX.title)
    desc[l] = `${s}。Professional security solutions for home & business.`.substring(0, SEO_MAX.desc)
    const parts = [name[l] || name.en || '']
    if (cat) parts.push(cat)
    parts.push('security camera', 'CCTV', 'surveillance', 'ETHAN')
    kw[l] = parts.filter(Boolean).join(', ').substring(0, SEO_MAX.keywords)
  }
  return { title, desc, kw }
}

function needsTranslation(name: Record<string, string>, summary: Record<string, string>, highlights: Array<Record<string, string>>): boolean {
  const hasZh = name.zh?.trim() || summary.zh?.trim()
  const hasEn = name.en?.trim() || summary.en?.trim()
  const hasEs = name.es?.trim() || summary.es?.trim()
  return !!hasZh && (!hasEn || !hasEs)
}

// ── Image Uploader ──
function ImageUploader({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [up, setup] = useState(false); const ref = useRef<HTMLInputElement>(null)
  const upload = async (f: File) => { setup(true); try { const fd = new FormData(); fd.append('file', f); fd.append('folder', 'products'); const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' }); const d = await r.json(); if (!r.ok) throw new Error(d.error); onChange(d.url) } catch (e) { alert((e as Error).message) } finally { setup(false) } }
  return (<div><label className="block text-sm text-gray-600 mb-1">{label}</label><div className="flex gap-3 items-start"><div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">{value ? <img src={value.startsWith('/') || value.startsWith('http') ? value : `/${value}`} className="w-full h-full object-cover" /> : <span className="text-gray-400 text-2xl">📷</span>}</div><div className="flex-1 space-y-2"><input value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /><div className="flex gap-2"><button type="button" onClick={() => ref.current?.click()} disabled={up} className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50">{up ? '...' : '上传'}</button>{value && <button type="button" onClick={() => onChange('')} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm">清除</button>}</div><input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value = '' }} /></div></div></div>)
}

function GalleryUploader({ onAdd }: { onAdd: (url: string) => void }) {
  const [up, setup] = useState(false); const ref = useRef<HTMLInputElement>(null)
  const upload = async (files: FileList) => { setup(true); try { for (const f of Array.from(files)) { const fd = new FormData(); fd.append('file', f); fd.append('folder', 'products'); const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' }); const d = await r.json(); if (!r.ok) throw new Error(d.error); onAdd(d.url) } } catch (e) { alert((e as Error).message) } finally { setup(false) } }
  return (<div className="flex gap-2"><button type="button" onClick={() => ref.current?.click()} disabled={up} className="px-3 py-1.5 border-2 border-dashed border-gray-300 text-gray-500 text-sm rounded-lg hover:border-cyan-400 disabled:opacity-50">{up ? '...' : '+ Gallery'}</button><input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) upload(e.target.files); e.target.value = '' }} /></div>)
}

// ═══════════════════════════════════════════════════════════
//  MAIN FORM
// ═══════════════════════════════════════════════════════════
export default function ProductForm({ initialData, categories, onSubmit, submitLabel }: ProductFormProps) {
  const [lang, setLang] = useState<LangKey>('zh')
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [translateStatus, setTranslateStatus] = useState('')

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
    seoTitle: (initialData?.seoTitle as Record<string, string>) || { zh: '', en: '', es: '' },
    seoDesc: (initialData?.seoDesc as Record<string, string>) || { zh: '', en: '', es: '' },
    seoKeywords: (initialData?.seoKeywords as Record<string, string>) || { zh: '', en: '', es: '' },
    logistics: (initialData?.logistics as Record<string, unknown>) || { moq: { zh: '', en: '', es: '' }, leadTime: { zh: '', en: '', es: '' }, warranty: { zh: '', en: '', es: '' }, datasheet: '' },
  })

  const catName = categories.find(c => c.id === form.categoryId)?.name?.en || categories.find(c => c.id === form.categoryId)?.name?.zh || ''

  // ── Update helpers ──
  const update = useCallback((field: string, value: unknown) => {
    setForm(prev => {
      const next = { ...prev, [field]: value } as typeof prev
      if (field === 'name' && !slugManuallyEdited) {
        const n = value as Record<string, string>
        next.slug = slugify(n.en || n.zh || '')
      }
      if (field === 'name' || field === 'summary' || field === 'brand' || field === 'categoryId') {
        const nd = field === 'name' ? (value as Record<string, string>) : prev.name
        const sd = field === 'summary' ? (value as Record<string, string>) : prev.summary
        const bd = field === 'brand' ? (value as string) : prev.brand
        const seo = buildSeoObj(nd, sd, bd, catName, lang)
        next.seoTitle = seo.title; next.seoDesc = seo.desc; next.seoKeywords = seo.kw
      }
      return next
    })
  }, [slugManuallyEdited, catName])

  const updateLang = useCallback((field: string, value: string) => {
    setForm(prev => {
      const cur = (prev as Record<string, unknown>)[field] as Record<string, string>
      const updated = { ...cur, [lang]: value }
      const next = { ...prev, [field]: updated } as typeof prev
      if (field === 'name' && !slugManuallyEdited) next.slug = slugify(lang === 'en' ? value : (cur.en || value))
      if (field === 'name' || field === 'summary') {
        const nd = field === 'name' ? updated : prev.name
        const sd = field === 'summary' ? updated : prev.summary
        const seo = buildSeoObj(nd, sd, prev.brand, catName, lang)
        next.seoTitle = seo.title; next.seoDesc = seo.desc; next.seoKeywords = seo.kw
      }
      return next
    })
  }, [lang, slugManuallyEdited, catName])

  // ── Slug uniqueness check ──
  const ensureUniqueSlug = useCallback(async (baseSlug: string): Promise<string> => {
    try {
      const r = await fetch(`/api/products/check-slug?slug=${encodeURIComponent(baseSlug)}&excludeId=${encodeURIComponent((initialData?.id as string) || '')}`, { credentials: 'include' })
      const d = await r.json()
      return d.available ? baseSlug : (d.suggestion || `${baseSlug}-1`)
    } catch { return baseSlug }
  }, [initialData])

  // ── 判断文本是否需要翻译 ──
function shouldTranslate(text: string): boolean {
  // 不含中文/日文/韩文 → 可能是纯数字/单位/英文，跳过
  return /[一-鿿぀-ゟ゠-ヿ가-힯]/.test(text)
}
  const autoTranslateAll = useCallback(async (currentForm: typeof form) => {
    const nameD = currentForm.name as Record<string, string>
    const summD = currentForm.summary as Record<string, string>
    const hl = currentForm.highlights
    const dt = currentForm.details
    const log = currentForm.logistics as Record<string, unknown>

    // Collect texts: [text, fieldKey, index?]
    const tasks: { text: string; key: string }[] = []
    if (nameD.zh?.trim()) tasks.push({ text: nameD.zh, key: 'name' })
    if (summD.zh?.trim()) tasks.push({ text: summD.zh, key: 'summary' })
    hl.forEach((h, i) => { if (h.zh?.trim()) tasks.push({ text: h.zh, key: `hl_${i}` }) })
    dt.forEach((row, i) => {
      const param = (row[0] as Record<string, string>).zh?.trim()
      const val = (row[1] as Record<string, string>).zh?.trim()
      if (param) tasks.push({ text: param, key: `dt_p_${i}` })
      if (val && shouldTranslate(val)) tasks.push({ text: val, key: `dt_v_${i}` })
    })
    // Logistics
    const moq = (log.moq as Record<string, string>)?.zh?.trim()
    const lt = (log.leadTime as Record<string, string>)?.zh?.trim()
    const wt = (log.warranty as Record<string, string>)?.zh?.trim()
    if (moq) tasks.push({ text: moq, key: 'log_moq' })
    if (lt) tasks.push({ text: lt, key: 'log_lt' })
    if (wt) tasks.push({ text: wt, key: 'log_wt' })

    if (tasks.length === 0) return currentForm

    const texts = tasks.map(t => t.text)
    try {
      const r = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts, from: 'zh', to: ['en', 'es'] }), credentials: 'include' })
      if (!r.ok) throw new Error('API error')
      const data = await r.json() as { translations: string[][] }

      const next = { ...currentForm }
      const nd = { ...nameD }; const sd = { ...summD }
      const nhl = hl.map(h => ({ ...h }))
      const ndt = dt.map(row => [ { ...(row[0] as Record<string, string>) }, { ...(row[1] as Record<string, string>) } ] as Array<Record<string, string>>)
      const nlog = { ...log }
      const nmoq = { ...(log.moq as Record<string, string>) }
      const nlt = { ...(log.leadTime as Record<string, string>) }
      const nwt = { ...(log.warranty as Record<string, string>) }

      tasks.forEach((task, idx) => {
        const enT = data.translations[idx]?.[0] || task.text // fallback: show Chinese
        const esT = data.translations[idx]?.[1] || task.text
        const k = task.key
        if (k === 'name') { if (!nd.en?.trim()) nd.en = enT; if (!nd.es?.trim()) nd.es = esT }
        else if (k === 'summary') { if (!sd.en?.trim()) sd.en = enT; if (!sd.es?.trim()) sd.es = esT }
        else if (k.startsWith('hl_')) { const i = parseInt(k.split('_')[1]); if (!nhl[i].en?.trim()) nhl[i].en = enT; if (!nhl[i].es?.trim()) nhl[i].es = esT }
        else if (k.startsWith('dt_p_')) { const i = parseInt(k.split('_')[2]); if (!ndt[i][0].en?.trim()) ndt[i][0].en = enT; if (!ndt[i][0].es?.trim()) ndt[i][0].es = esT }
        else if (k.startsWith('dt_v_')) { const i = parseInt(k.split('_')[2]); if (!ndt[i][1].en?.trim()) ndt[i][1].en = enT; if (!ndt[i][1].es?.trim()) ndt[i][1].es = esT }
        else if (k === 'log_moq') { if (!nmoq.en?.trim()) nmoq.en = enT; if (!nmoq.es?.trim()) nmoq.es = esT }
        else if (k === 'log_lt') { if (!nlt.en?.trim()) nlt.en = enT; if (!nlt.es?.trim()) nlt.es = esT }
        else if (k === 'log_wt') { if (!nwt.en?.trim()) nwt.en = enT; if (!nwt.es?.trim()) nwt.es = esT }
      })

      next.name = nd; next.summary = sd; next.highlights = nhl; next.details = ndt
      nlog.moq = nmoq; nlog.leadTime = nlt; nlog.warranty = nwt; next.logistics = nlog

      // SEO：翻译后每种语言独立生成
      const seo = buildSeoObj(nd, sd, currentForm.brand, catName, 'zh')
      next.seoTitle = seo.title; next.seoDesc = seo.desc; next.seoKeywords = seo.kw

      if (!slugManuallyEdited && nd.en?.trim()) next.slug = slugify(nd.en)

      return next
    } catch {
      // 降级：翻译失败不阻断，显示中文原文
      setTranslateStatus('⚠️ 翻译服务暂不可用，英文/西语已保留中文原文，可稍后重新翻译')
      return currentForm
    }
  }, [slugManuallyEdited, catName])

  // ── Manual translate button ──
  const handleTranslate = async () => {
    if (!(form.name as Record<string, string>).zh?.trim()) { alert('请先填写中文产品名称'); return }
    setTranslating(true); setTranslateStatus('')
    try {
      const translated = await autoTranslateAll(form)
      setForm(translated)
      setTranslateStatus('✅ 翻译完成！英文和西班牙语已自动填入')
    } catch { setTranslateStatus('⚠️ 翻译失败，请稍后重试')
    } finally { setTranslating(false) }
  }

  // ── Submit: auto-translate if EN/ES empty ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      let final = form
      if (needsTranslation(form.name as Record<string, string>, form.summary as Record<string, string>, form.highlights)) {
        final = await autoTranslateAll(form)
        setForm(final)
      }
      // Ensure unique slug
      if (final.slug) {
        final = { ...final, slug: await ensureUniqueSlug(final.slug) }
        setForm(final)
      }
      await onSubmit(final as unknown as Record<string, unknown>)
    } finally { setLoading(false) }
  }

  // ── Sub-component helpers ──
  const addHl = () => setForm(p => ({ ...p, highlights: [...p.highlights, { zh: '', en: '', es: '' }] }))
  const rmHl = (i: number) => setForm(p => ({ ...p, highlights: p.highlights.filter((_, x) => x !== i) }))
  const upHl = (i: number, v: string) => setForm(p => { const h = [...p.highlights]; h[i] = { ...h[i], [lang]: v }; return { ...p, highlights: h } })
  const addDt = () => setForm(p => ({ ...p, details: [...p.details, [{ zh: '', en: '', es: '' }, { zh: '', en: '', es: '' }]] }))
  const rmDt = (i: number) => setForm(p => ({ ...p, details: p.details.filter((_, x) => x !== i) }))
  const upDt = (i: number, j: number, v: string) => setForm(p => { const d = p.details.map(r => [...r]); const c = d[i][j] as Record<string, string>; d[i][j] = { ...c, [lang]: v }; return { ...p, details: d } })

  const logField = (field: string): Record<string, string> =>
    ((form.logistics as Record<string, unknown>)[field] as Record<string, string>) || { zh: '', en: '', es: '' }

  const upLog = (field: string, value: string) => {
    const cur = logField(field)
    update('logistics', { ...form.logistics, [field]: { ...cur, [lang]: value } })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Header: Language Tabs + Translate ── */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 items-center justify-between flex-wrap">
        <div className="flex gap-2">
          {LANGS.map(l => (
            <button key={l.key} type="button" onClick={() => setLang(l.key)}
              className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${lang === l.key ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {translateStatus && <span className={`text-xs ${translateStatus.startsWith('✅') ? 'text-green-600' : 'text-amber-600'}`}>{translateStatus}</span>}
          <button type="button" onClick={handleTranslate} disabled={translating}
            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-sm">
            {translating ? '⏳ 翻译中...' : '🌐 自动翻译 (中→英+西)'}
          </button>
        </div>
      </div>

      {/* ── Basic Info ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">基本信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">产品名称 ({LANGS.find(l => l.key === lang)!.label})</label>
            <input value={(form.name as Record<string, string>)[lang] || ''} onChange={e => updateLang('name', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" placeholder={lang === 'zh' ? '中文产品名称（必填）' : '将自动翻译填入'} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Slug</label>
            <input value={form.slug} onChange={e => { setSlugManuallyEdited(true); update('slug', e.target.value) }}
              className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">SKU</label><input value={form.sku} onChange={e => update('sku', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">品牌</label><input value={form.brand} onChange={e => update('brand', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">分类</label>
            <select value={form.categoryId} onChange={e => update('categoryId', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">选择分类</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name.en || c.name.zh}</option>)}</select></div>
          <div><label className="block text-sm text-gray-600 mb-1">价格 (USD)</label><input type="number" step="0.01" value={form.price} onChange={e => update('price', parseFloat(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">库存</label><input type="number" value={form.stock} onChange={e => update('stock', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">MOQ</label><input type="number" value={form.moq} onChange={e => update('moq', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">标签</label><select value={form.badge} onChange={e => update('badge', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">无</option><option value="bestseller">Bestseller</option><option value="new">New</option><option value="hot">Hot</option><option value="sale">Sale</option></select></div>
          <div><label className="block text-sm text-gray-600 mb-1">状态</label><select value={form.status} onChange={e => update('status', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="ACTIVE">上架</option><option value="DRAFT">草稿</option><option value="INACTIVE">下架</option></select></div>
        </div>
        <div><label className="block text-sm text-gray-600 mb-1">产品简介 ({LANGS.find(l => l.key === lang)!.label})</label>
          <textarea value={(form.summary as Record<string, string>)[lang] || ''} onChange={e => updateLang('summary', e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
      </div>

      {/* ── Highlights ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2"><h2 className="font-semibold text-gray-800">产品亮点</h2><button type="button" onClick={addHl} className="text-sm text-cyan-600 hover:underline">+ 添加亮点</button></div>
        {form.highlights.map((h, i) => (<div key={i} className="flex gap-2 items-center"><input value={h[lang] || ''} onChange={e => upHl(i, e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder={`亮点 ${i + 1}`} /><button type="button" onClick={() => rmHl(i)} className="text-red-500 text-sm">删除</button></div>))}
      </div>

      {/* ── Details (Specs) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2"><h2 className="font-semibold text-gray-800">规格参数</h2><button type="button" onClick={addDt} className="text-sm text-cyan-600 hover:underline">+ 添加参数</button></div>
        {form.details.map((row, i) => (<div key={i} className="flex gap-2 items-center"><input value={(row[0] as Record<string, string>)[lang] || ''} onChange={e => upDt(i, 0, e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="参数名" /><input value={(row[1] as Record<string, string>)[lang] || ''} onChange={e => upDt(i, 1, e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="参数值" /><button type="button" onClick={() => rmDt(i)} className="text-red-500 text-sm">删除</button></div>))}
      </div>

      {/* ── Images ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">图片</h2>
        <ImageUploader label="主图" value={form.images.main} onChange={url => update('images', { ...form.images, main: url })} />
        <div><label className="block text-sm text-gray-600 mb-2">图片库</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">{form.images.gallery.map((url, i) => (<div key={i} className="relative group border border-gray-200 rounded-lg overflow-hidden aspect-square bg-gray-50">{url ? <img src={url.startsWith('/') || url.startsWith('http') ? url : `/${url}`} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-gray-400">📷</div>}<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button type="button" onClick={() => { const g = [...form.images.gallery]; g.splice(i, 1); update('images', { ...form.images, gallery: g }) }} className="bg-red-500 text-white text-xs px-2 py-1 rounded">删除</button></div></div>))}</div>
          <GalleryUploader onAdd={url => update('images', { ...form.images, gallery: [...form.images.gallery, url] })} /></div>
      </div>

      {/* ── SEO (auto-generated, editable) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">SEO <span className="text-cyan-600 text-xs font-normal">({lang==='zh'?'中文':lang==='en'?'English':'Español'} — 可修改)</span></h2>
        <div><label className="block text-sm text-gray-600 mb-1">SEO 标题 <span className="text-gray-400">({(form.seoTitle[lang]||'').length}/{SEO_MAX.title})</span></label>
          <input value={form.seoTitle[lang] || ''} onChange={e => { const t = {...form.seoTitle}; t[lang]=e.target.value.slice(0,SEO_MAX.title); update('seoTitle',t) }} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50" /></div>
        <div><label className="block text-sm text-gray-600 mb-1">SEO 描述 <span className="text-gray-400">({(form.seoDesc[lang]||'').length}/{SEO_MAX.desc})</span></label>
          <textarea value={form.seoDesc[lang] || ''} onChange={e => { const d = {...form.seoDesc}; d[lang]=e.target.value.slice(0,SEO_MAX.desc); update('seoDesc',d) }} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50" /></div>
        <div><label className="block text-sm text-gray-600 mb-1">SEO 关键词 <span className="text-gray-400">({(form.seoKeywords[lang]||'').length}/{SEO_MAX.keywords})</span></label>
          <input value={form.seoKeywords[lang] || ''} onChange={e => { const k = {...form.seoKeywords}; k[lang]=e.target.value.slice(0,SEO_MAX.keywords); update('seoKeywords',k) }} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50" /></div>
      </div>

      {/* ── Logistics ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b pb-2">物流信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['moq', 'leadTime', 'warranty'] as const).map(f => (
            <div key={f}><label className="block text-sm text-gray-600 mb-1">{f === 'moq' ? 'MOQ' : f === 'leadTime' ? '交货时间' : '质保'} ({LANGS.find(l => l.key === lang)!.label})</label>
              <input value={logField(f)[lang] || ''} onChange={e => upLog(f, e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          ))}
          <div><label className="block text-sm text-gray-600 mb-1">规格书文件</label>
            <input value={((form.logistics as Record<string, unknown>).datasheet as string) || ''} onChange={e => update('logistics', { ...form.logistics, datasheet: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        </div>
      </div>

      {/* ── Submit ── */}
      <div className="flex justify-end gap-3 items-center">
        {loading && <span className="text-sm text-gray-500 flex items-center gap-1"><span className="inline-block w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />正在翻译并保存...</span>}
        <button type="submit" disabled={loading} className="bg-cyan-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50 transition-colors">{loading ? '保存中...' : submitLabel}</button>
      </div>
    </form>
  )
}

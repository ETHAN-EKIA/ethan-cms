'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

interface Blog { id: string; title: Record<string, string>; slug: string; status: string; coverImage: string; images?: { gallery: string[] }; createdAt: string; author?: { displayName: string } }
interface BlogList { data: Blog[]; total: number; page: number; totalPages: number }

type LangKey = 'zh' | 'en' | 'es'
const LANGS: { key: LangKey; label: string }[] = [
  { key: 'zh', label: '中文' },
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Español' },
]

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-+|-+$/g, '').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').substring(0, 80)
}

// ── 单图上传组件（封面图） ──
function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [up, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const upload = async (f: File) => {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', f); fd.append('folder', 'blogs')
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      onChange(d.url)
    } catch (e) { alert((e as Error).message) } finally { setUploading(false) }
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
        {value ? <img src={value.startsWith('/') || value.startsWith('http') ? value : `/${value}`} className="w-full h-full object-cover" alt="" /> : <span className="text-gray-400 text-2xl">🖼️</span>}
      </div>
      <div className="flex-1 space-y-2">
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="粘贴图片URL或点击上传" className="w-full px-3 py-2 border rounded-lg text-sm" />
        <div className="flex gap-2">
          <button type="button" onClick={() => ref.current?.click()} disabled={up} className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50">{up ? '⏳ 上传中...' : '📤 上传图片'}</button>
          {value && <button type="button" onClick={() => onChange('')} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm hover:bg-gray-300">清除</button>}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value = '' }} />
      </div>
    </div>
  )
}

// ── 多图上传组件（图库） ──
function GalleryUploader({ images, onChange }: { images: string[]; onChange: (urls: string[]) => void }) {
  const [up, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const upload = async (files: FileList) => {
    setUploading(true)
    const urls = [...images]
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData(); fd.append('file', f); fd.append('folder', 'blogs')
        const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
        const d = await r.json(); if (!r.ok) throw new Error(d.error)
        urls.push(d.url)
      }
      onChange(urls)
    } catch (e) { alert((e as Error).message) } finally { setUploading(false) }
  }

  const removeImage = (index: number) => {
    const next = [...images]; next.splice(index, 1); onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => ref.current?.click()} disabled={up} className="px-3 py-1.5 border-2 border-dashed border-gray-300 text-gray-500 text-sm rounded-lg hover:border-cyan-400 disabled:opacity-50">
          {up ? '⏳ 上传中...' : '+ 添加图片'}
        </button>
        <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) upload(e.target.files); e.target.value = '' }} />
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((url, i) => (
            <div key={i} className="relative group border border-gray-200 rounded-lg overflow-hidden aspect-square bg-gray-50">
              <img src={url.startsWith('/') || url.startsWith('http') ? url : `/${url}`} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button type="button" onClick={() => removeImage(i)} className="bg-red-500 text-white text-xs px-2 py-1 rounded">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [lang, setLang] = useState<LangKey>('zh')
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translateStatus, setTranslateStatus] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const [form, setForm] = useState({
    slug: '', status: 'DRAFT', coverImage: '', images: [] as string[],
    title: { zh: '', en: '', es: '' } as Record<string, string>,
    excerpt: { zh: '', en: '', es: '' } as Record<string, string>,
    content: { zh: '', en: '', es: '' } as Record<string, string>,
    seoTitle: '', seoDesc: '',
  })

  const totalPages = Math.ceil(total / 20)

  const load = () => { apiGet<BlogList>(`/blogs?page=${page}&limit=20`).then(d => { setBlogs(d.data); setTotal(d.total) }).catch(() => {}) }
  useEffect(() => { load() }, [page])

  const openNew = () => {
    setEditId(null); setSlugManuallyEdited(false); setTranslateStatus('')
    setForm({ slug: '', status: 'DRAFT', coverImage: '', images: [], title: { zh: '', en: '', es: '' }, excerpt: { zh: '', en: '', es: '' }, content: { zh: '', en: '', es: '' }, seoTitle: '', seoDesc: '' })
    setShowForm(true)
  }

  const openEdit = (b: Blog) => {
    apiGet<Blog & { excerpt: Record<string, string>; content: Record<string, string>; images?: { gallery: string[] }; seoTitle: string; seoDesc: string }>(`/blogs/${b.id}`).then(full => {
      setEditId(b.id); setSlugManuallyEdited(true); setTranslateStatus('')
      const gallery = full.images?.gallery || []
      setForm({
        slug: full.slug, status: full.status, coverImage: full.coverImage || '', images: gallery,
        title: (full.title || { zh: '', en: '', es: '' }) as Record<string, string>,
        excerpt: (full.excerpt || { zh: '', en: '', es: '' }) as Record<string, string>,
        content: (full.content || { zh: '', en: '', es: '' }) as Record<string, string>,
        seoTitle: full.seoTitle || '', seoDesc: full.seoDesc || '',
      })
      setShowForm(true)
    }).catch(() => {})
  }

  const updateField = (field: string, value: unknown) => {
    setForm(prev => {
      const next = { ...prev, [field]: value } as typeof prev
      if (field === 'title' && !slugManuallyEdited) {
        const n = value as Record<string, string>
        next.slug = slugify(n.zh || '')
      }
      return next
    })
  }

  const updateLang = (field: string, value: string) => {
    setForm(prev => {
      const cur = (prev as Record<string, unknown>)[field] as Record<string, string>
      const updated = { ...cur, [lang]: value }
      const next = { ...prev, [field]: updated } as typeof prev
      if (field === 'title' && !slugManuallyEdited) next.slug = slugify(updated.zh || updated.en || '')
      return next
    })
  }

  // ── 判断文本是否需要翻译 ──
  const needsTranslation = useCallback((t: Record<string, string>, e: Record<string, string>, c: Record<string, string>): boolean => {
    const hasZh = t.zh?.trim() || e.zh?.trim() || c.zh?.trim()
    const hasEn = t.en?.trim() || e.en?.trim() || c.en?.trim()
    const hasEs = t.es?.trim() || e.es?.trim() || c.es?.trim()
    return !!hasZh && (!hasEn || !hasEs)
  }, [])

  // ── 自动翻译 ──
  const autoTranslateAll = useCallback(async (currentForm: typeof form) => {
    const td = currentForm.title; const ed = currentForm.excerpt; const cd = currentForm.content

    const tasks: { text: string; key: string }[] = []
    if (td.zh?.trim()) tasks.push({ text: td.zh, key: 'title' })
    if (ed.zh?.trim()) tasks.push({ text: ed.zh, key: 'excerpt' })
    if (cd.zh?.trim()) tasks.push({ text: cd.zh, key: 'content' })

    if (tasks.length === 0) return currentForm

    const texts = tasks.map(t => t.text)
    try {
      const r = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts, from: 'zh', to: ['en', 'es'] }), credentials: 'include' })
      if (!r.ok) throw new Error('API error')
      const data = await r.json() as { translations: string[][] }

      const next = { ...currentForm }
      const nt = { ...td }; const ne = { ...ed }; const nc = { ...cd }

      tasks.forEach((task, idx) => {
        const enT = data.translations[idx]?.[0] || task.text
        const esT = data.translations[idx]?.[1] || task.text
        if (task.key === 'title') { if (!nt.en?.trim()) nt.en = enT; if (!nt.es?.trim()) nt.es = esT }
        else if (task.key === 'excerpt') { if (!ne.en?.trim()) ne.en = enT; if (!ne.es?.trim()) ne.es = esT }
        else if (task.key === 'content') { if (!nc.en?.trim()) nc.en = enT; if (!nc.es?.trim()) nc.es = esT }
      })

      next.title = nt; next.excerpt = ne; next.content = nc
      if (!slugManuallyEdited && nt.en?.trim()) next.slug = slugify(nt.en)
      return next
    } catch {
      setTranslateStatus('⚠️ 翻译服务暂不可用，英文/西语已保留中文原文，可稍后重新翻译')
      return currentForm
    }
  }, [slugManuallyEdited])

  // ── 手动翻译按钮 ──
  const handleTranslate = async () => {
    if (!form.title.zh?.trim()) { alert('请先填写中文标题'); return }
    setTranslating(true); setTranslateStatus('')
    try {
      const translated = await autoTranslateAll(form)
      setForm(translated)
      setTranslateStatus('✅ 翻译完成！英文和西班牙语已自动填入')
    } catch { setTranslateStatus('⚠️ 翻译失败，请稍后重试')
    } finally { setTranslating(false) }
  }

  // ── 保存：自动翻译如果英/西为空 ──
  const handleSave = async () => {
    setSaving(true)
    try {
      let final = form
      if (needsTranslation(form.title, form.excerpt, form.content)) {
        final = await autoTranslateAll(form)
        setForm(final)
      }
      const payload = {
        ...final,
        images: { gallery: final.images },
      }
      if (editId) await apiPut(`/blogs/${editId}`, payload)
      else await apiPost('/blogs', payload)
      setShowForm(false); load()
    } catch { alert('保存失败') } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-gray-800">新闻博客</h1>
        <button onClick={openNew} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">+ 新建文章</button></div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          {/* ── Header: Language Tabs + Translate ── */}
          <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-800">{editId ? '编辑文章' : '新建文章'}</h2>
            </div>
            <div className="flex items-center gap-2">
              {translateStatus && <span className={`text-xs ${translateStatus.startsWith('✅') ? 'text-green-600' : 'text-amber-600'}`}>{translateStatus}</span>}
              <button type="button" onClick={handleTranslate} disabled={translating}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-sm">
                {translating ? '⏳ 翻译中...' : '🌐 自动翻译 (中→英+西)'}
              </button>
            </div>
          </div>

          {/* ── Language Tabs ── */}
          <div className="flex gap-2">
            {LANGS.map(l => (
              <button key={l.key} type="button" onClick={() => setLang(l.key)}
                className={`px-4 py-1.5 text-sm rounded ${lang === l.key ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 标题 */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">标题 ({LANGS.find(l => l.key === lang)!.label})</label>
              <input value={form.title[lang] || ''} onChange={e => updateLang('title', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder={lang === 'zh' ? '中文标题（必填，将自动翻译）' : '翻译后自动填入'} />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Slug</label>
              <input value={form.slug} onChange={e => { setSlugManuallyEdited(true); updateField('slug', e.target.value) }}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">状态</label>
              <select value={form.status} onChange={e => updateField('status', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="DRAFT">草稿</option><option value="PUBLISHED">发布</option><option value="ARCHIVED">归档</option>
              </select>
            </div>

            {/* 摘要 */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">摘要 ({LANGS.find(l => l.key === lang)!.label})</label>
              <textarea value={form.excerpt[lang] || ''} onChange={e => updateLang('excerpt', e.target.value)} rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder={lang === 'zh' ? '中文摘要（将自动翻译）' : '翻译后自动填入'} />
            </div>

            {/* 内容 */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">内容 ({LANGS.find(l => l.key === lang)!.label})</label>
              <textarea value={form.content[lang] || ''} onChange={e => updateLang('content', e.target.value)} rows={6}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder={lang === 'zh' ? '中文内容（将自动翻译）' : '翻译后自动填入'} />
            </div>

            {/* 封面图片 */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">封面图片</label>
              <ImageUploader value={form.coverImage} onChange={url => updateField('coverImage', url)} />
            </div>

            {/* 多图图库 */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">文章图库 <span className="text-gray-400 font-normal">(可上传多张)</span></label>
              <GalleryUploader images={form.images} onChange={urls => updateField('images', urls)} />
            </div>

            {/* SEO */}
            <div><label className="block text-sm text-gray-600 mb-1">SEO 标题</label>
              <input value={form.seoTitle} onChange={e => updateField('seoTitle', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">SEO 描述</label>
              <input value={form.seoDesc} onChange={e => updateField('seoDesc', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <button onClick={handleSave} disabled={saving} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700 disabled:opacity-50">
              {saving ? '⏳ 保存中...' : '保存'}
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">取消</button>
          </div>
        </div>
      )}

      {/* ── Blog List Table ── */}
      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b bg-gray-50">
            <th className="p-3">标题</th><th className="p-3">状态</th><th className="p-3">作者</th><th className="p-3">日期</th><th className="p-3">操作</th>
          </tr></thead>
          <tbody>
            {blogs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">暂无文章</td></tr>}
            {blogs.map(b => (
              <tr key={b.id} className="border-b border-gray-50">
                <td className="p-3"><p className="font-medium">{b.title?.zh || b.title?.en || '-'}</p><p className="text-xs text-gray-400">{b.slug}</p></td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{b.status}</span></td>
                <td className="p-3">{b.author?.displayName || '-'}</td>
                <td className="p-3 text-xs text-gray-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => openEdit(b)} className="text-cyan-600 hover:underline text-xs">编辑</button>
                  <button onClick={() => { if (confirm('删除？')) apiDelete(`/blogs/${b.id}`).then(load) }} className="text-red-500 hover:underline text-xs">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border p-4">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">上一页</button>
            <span className="px-3 py-1 text-sm">{page}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">下一页</button>
          </div>
        </div>
      )}
    </div>
  )
}

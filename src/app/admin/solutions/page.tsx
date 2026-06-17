'use client'

import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

interface Solution { id: string; name: Record<string, string>; slug: string; icon: string; image: string; productCount: string; sortOrder: number; description?: Record<string, string> }
const langs = ['zh', 'en', 'es']

export default function SolutionsPage() {
  const [items, setItems] = useState<Solution[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<{ slug: string; icon: string; image: string; productCount: string; sortOrder: number; name: Record<string, string>; description: Record<string, string> }>({ slug: '', icon: '', image: '', productCount: '', sortOrder: 0, name: { zh: '', en: '', es: '' }, description: { zh: '', en: '', es: '' } })
  const [lang, setLang] = useState('en')

  // ── 图片上传 ──
  const imgRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const uploadImage = async (f: File) => {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', f); fd.append('folder', 'solutions')
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      setForm({ ...form, image: d.url })
    } catch (e) { alert((e as Error).message) } finally { setUploading(false) }
  }

  const load = () => { apiGet<Solution[]>('/solutions').then(setItems).catch(console.error) }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditId(null); setForm({ slug: '', icon: '', image: '', productCount: '', sortOrder: 0, name: { zh: '', en: '', es: '' }, description: { zh: '', en: '', es: '' } }); setShowForm(true) }
  const openEdit = (s: Solution) => { setEditId(s.id); setForm({ slug: s.slug, icon: s.icon || '', image: s.image || '', productCount: s.productCount || '', sortOrder: s.sortOrder, name: s.name as Record<string, string>, description: (s.description || { zh: '', en: '', es: '' }) as Record<string, string> }); setShowForm(true) }

  const save = async () => {
    if (editId) await apiPut(`/solutions/${editId}`, form); else await apiPost('/solutions', form)
    setShowForm(false); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-gray-800">解决方案</h1>
        <button onClick={openNew} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">+ 新增</button></div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">{editId ? '编辑' : '新增'}</h2>
          <div className="flex gap-2">{langs.map(l => (<button key={l} type="button" onClick={() => setLang(l)} className={`px-3 py-1 text-sm rounded ${lang === l ? 'bg-cyan-600 text-white' : 'bg-gray-100'}`}>{l}</button>))}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-600 mb-1">名称 ({lang})</label><input value={form.name[lang] || ''} onChange={e => setForm({ ...form, name: { ...form.name, [lang]: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">Slug</label><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">描述 ({lang})</label><input value={form.description[lang] || ''} onChange={e => setForm({ ...form, description: { ...form.description, [lang]: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">图片</label>
              <div className="flex gap-3 items-start">
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                  {form.image ? <img src={form.image.startsWith('/') || form.image.startsWith('http') ? form.image : `/${form.image}`} className="w-full h-full object-cover" /> : <span className="text-gray-400 text-2xl">📷</span>}
                </div>
                <div className="flex-1 space-y-2">
                  <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="图片URL" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading} className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50">{uploading ? '上传中...' : '上传图片'}</button>
                    {form.image && <button type="button" onClick={() => setForm({ ...form, image: '' })} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm">清除</button>}
                  </div>
                  <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadImage(e.target.files[0]); e.target.value = '' }} />
                </div>
              </div>
            </div>
            <div><label className="block text-sm text-gray-600 mb-1">图标</label><input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">推荐产品数</label><input value={form.productCount} onChange={e => setForm({ ...form, productCount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2"><button onClick={save} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm">保存</button><button onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">取消</button></div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b bg-gray-50"><th className="p-3">名称</th><th className="p-3">Slug</th><th className="p-3">产品数</th><th className="p-3">排序</th><th className="p-3">操作</th></tr></thead>
          <tbody>{items.map(s => (
            <tr key={s.id} className="border-b border-gray-50">
              <td className="p-3">{s.name?.en || s.name?.zh}</td><td className="p-3 font-mono text-xs">{s.slug}</td>
              <td className="p-3">{s.productCount || '-'}</td><td className="p-3">{s.sortOrder}</td>
              <td className="p-3 flex gap-2"><button onClick={() => openEdit(s)} className="text-cyan-600 hover:underline text-xs">编辑</button>
                <button onClick={() => { if (confirm('删除？')) apiDelete(`/solutions/${s.id}`).then(load) }} className="text-red-500 hover:underline text-xs">删除</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

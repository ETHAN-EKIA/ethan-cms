'use client'

import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

interface Testimonial { id: string; author: Record<string, string>; role: Record<string, string>; text: Record<string, string>; stars: number; image: string; company: string; country: string; sortOrder: number }
const langs = ['zh', 'en', 'es']

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ stars: 5, image: '', company: '', country: '', sortOrder: 0, author: { zh: '', en: '', es: '' } as Record<string, string>, role: { zh: '', en: '', es: '' } as Record<string, string>, text: { zh: '', en: '', es: '' } as Record<string, string> })
  const [lang, setLang] = useState('en')

  // ── 图片上传 ──
  const imgRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const uploadImage = async (f: File) => {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', f); fd.append('folder', 'testimonials')
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const d = await r.json(); if (!r.ok) throw new Error(d.error)
      setForm({ ...form, image: d.url })
    } catch (e) { alert((e as Error).message) } finally { setUploading(false) }
  }

  const load = () => { apiGet<Testimonial[]>('/testimonials').then(setItems).catch(console.error) }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditId(null); setForm({ stars: 5, image: '', company: '', country: '', sortOrder: 0, author: { zh: '', en: '', es: '' }, role: { zh: '', en: '', es: '' }, text: { zh: '', en: '', es: '' } }); setShowForm(true) }
  const openEdit = (t: Testimonial) => { setEditId(t.id); setForm({ stars: t.stars, image: t.image || '', company: t.company || '', country: t.country || '', sortOrder: t.sortOrder, author: t.author as Record<string, string>, role: (t.role || { zh: '', en: '', es: '' }) as Record<string, string>, text: t.text as Record<string, string> }); setShowForm(true) }

  const save = async () => {
    if (editId) await apiPut(`/testimonials/${editId}`, form); else await apiPost('/testimonials', form)
    setShowForm(false); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-gray-800">客户反馈</h1>
        <button onClick={openNew} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">+ 新增</button></div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div className="flex gap-2">{langs.map(l => (<button key={l} type="button" onClick={() => setLang(l)} className={`px-3 py-1 text-sm rounded ${lang === l ? 'bg-cyan-600 text-white' : 'bg-gray-100'}`}>{l}</button>))}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-600 mb-1">作者 ({lang})</label><input value={form.author[lang] || ''} onChange={e => setForm({ ...form, author: { ...form.author, [lang]: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">角色 ({lang})</label><input value={form.role[lang] || ''} onChange={e => setForm({ ...form, role: { ...form.role, [lang]: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">评价 ({lang})</label><textarea value={form.text[lang] || ''} onChange={e => setForm({ ...form, text: { ...form.text, [lang]: e.target.value } })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">星级</label><input type="number" min="1" max="5" value={form.stars} onChange={e => setForm({ ...form, stars: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
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
            <div><label className="block text-sm text-gray-600 mb-1">国家</label><input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">公司</label><input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2"><button onClick={save} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm">保存</button><button onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">取消</button></div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b bg-gray-50"><th className="p-3">作者</th><th className="p-3">角色</th><th className="p-3">星级</th><th className="p-3">国家</th><th className="p-3">操作</th></tr></thead>
          <tbody>{items.map(t => (
            <tr key={t.id} className="border-b border-gray-50">
              <td className="p-3">{t.author?.en || t.author?.zh}</td><td className="p-3 text-xs">{t.role?.en || t.role?.zh}</td>
              <td className="p-3">{'⭐'.repeat(t.stars)}</td><td className="p-3">{t.country || '-'}</td>
              <td className="p-3 flex gap-2"><button onClick={() => openEdit(t)} className="text-cyan-600 hover:underline text-xs">编辑</button>
                <button onClick={() => { if (confirm('删除？')) apiDelete(`/testimonials/${t.id}`).then(load) }} className="text-red-500 hover:underline text-xs">删除</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

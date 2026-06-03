'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

interface Download { id: string; name: Record<string, string>; type: string; fileUrl: string; fileSize: string; version: string; sortOrder: number; productId?: string; product?: { id: string; name: Record<string, string> } }
interface Product { id: string; name: Record<string, string> }
const langs = ['zh', 'en', 'es']

export default function DownloadsPage() {
  const [items, setItems] = useState<Download[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ type: 'PDF', fileUrl: '', fileSize: '', version: '', sortOrder: 0, productId: '', name: { zh: '', en: '', es: '' } as Record<string, string> })
  const [lang, setLang] = useState('en')

  const load = () => { apiGet<Download[]>('/downloads').then(setItems).catch(console.error) }
  useEffect(() => {
    load()
    apiGet<{ data: Product[] }>('/products?limit=100').then(d => setProducts(d.data)).catch(console.error)
  }, [])

  const openNew = () => { setEditId(null); setForm({ type: 'PDF', fileUrl: '', fileSize: '', version: '', sortOrder: 0, productId: '', name: { zh: '', en: '', es: '' } }); setShowForm(true) }
  const openEdit = (d: Download) => { setEditId(d.id); setForm({ type: d.type, fileUrl: d.fileUrl, fileSize: d.fileSize || '', version: d.version || '', sortOrder: d.sortOrder, productId: d.productId || '', name: d.name as Record<string, string> }); setShowForm(true) }

  const save = async () => {
    if (editId) await apiPut(`/downloads/${editId}`, form); else await apiPost('/downloads', form)
    setShowForm(false); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-gray-800">下载中心</h1>
        <button onClick={openNew} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">+ 新增</button></div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <div className="flex gap-2">{langs.map(l => (<button key={l} type="button" onClick={() => setLang(l)} className={`px-3 py-1 text-sm rounded ${lang === l ? 'bg-cyan-600 text-white' : 'bg-gray-100'}`}>{l}</button>))}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-600 mb-1">名称 ({lang})</label><input value={form.name[lang] || ''} onChange={e => setForm({ ...form, name: { ...form.name, [lang]: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">类型</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option>PDF</option><option>ZIP</option><option>DOC</option><option>OTHER</option></select></div>
            <div><label className="block text-sm text-gray-600 mb-1">文件 URL</label><input value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">文件大小</label><input value={form.fileSize} onChange={e => setForm({ ...form, fileSize: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">版本</label><input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">关联产品</label>
              <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">无</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name?.en || p.name?.zh || '-'}</option>)}
              </select></div>
          </div>
          <div className="flex gap-2"><button onClick={save} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm">保存</button><button onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">取消</button></div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b bg-gray-50"><th className="p-3">名称</th><th className="p-3">类型</th><th className="p-3">大小</th><th className="p-3">版本</th><th className="p-3">操作</th></tr></thead>
          <tbody>{items.map(d => (
            <tr key={d.id} className="border-b border-gray-50">
              <td className="p-3">{d.name?.en || d.name?.zh}</td><td className="p-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{d.type}</span></td>
              <td className="p-3 text-xs">{d.fileSize || '-'}</td><td className="p-3 text-xs">{d.version || '-'}</td>
              <td className="p-3 flex gap-2"><button onClick={() => openEdit(d)} className="text-cyan-600 hover:underline text-xs">编辑</button>
                <button onClick={() => { if (confirm('删除？')) apiDelete(`/downloads/${d.id}`).then(load) }} className="text-red-500 hover:underline text-xs">删除</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

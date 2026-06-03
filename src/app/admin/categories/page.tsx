'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

interface Category {
  id: string; name: Record<string, string>; slug: string; icon: string; sortOrder: number;
  _count?: { products: number }
}

const langs = ['zh', 'en', 'es']

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<{ slug: string; icon: string; sortOrder: number; name: Record<string, string> }>({ slug: '', icon: '', sortOrder: 0, name: { zh: '', en: '', es: '' } })
  const [lang, setLang] = useState('en')

  const load = () => { apiGet<Category[]>('/categories').then(setCategories).catch(console.error) }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditId(null); setForm({ slug: '', icon: '', sortOrder: 0, name: { zh: '', en: '', es: '' } }); setShowForm(true) }
  const openEdit = (c: Category) => { setEditId(c.id); setForm({ slug: c.slug, icon: c.icon || '', sortOrder: c.sortOrder, name: c.name as Record<string, string> }); setShowForm(true) }

  const handleSave = async () => {
    try {
      if (editId) await apiPut(`/categories/${editId}`, form)
      else await apiPost('/categories', form)
      setShowForm(false); load()
    } catch (e: unknown) {
      alert((e as Error).message || '操作失败，请重试')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除？')) return
    try {
      await apiDelete(`/categories/${id}`)
      load()
    } catch (e: unknown) {
      alert((e as Error).message || '删除失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">分类管理</h1>
        <button onClick={openNew} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">+ 新增分类</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">{editId ? '编辑分类' : '新增分类'}</h2>
          <div className="flex gap-2">{langs.map(l => (
            <button key={l} type="button" onClick={() => setLang(l)} className={`px-3 py-1 text-sm rounded ${lang === l ? 'bg-cyan-600 text-white' : 'bg-gray-100'}`}>{l}</button>
          ))}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-600 mb-1">名称 ({lang})</label>
              <input value={form.name[lang] || ''} onChange={e => setForm({ ...form, name: { ...form.name, [lang]: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">Slug</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">图标</label>
              <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">排序</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2"><button onClick={handleSave} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm">保存</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">取消</button></div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b bg-gray-50">
            <th className="p-3">名称</th><th className="p-3">Slug</th><th className="p-3">产品数</th><th className="p-3">排序</th><th className="p-3">操作</th>
          </tr></thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="p-3"><span className="font-medium">{c.name?.en || c.name?.zh}</span><br/><span className="text-xs text-gray-400">{c.name?.zh}</span></td>
                <td className="p-3 font-mono text-xs">{c.slug}</td>
                <td className="p-3">{c._count?.products || 0}</td>
                <td className="p-3">{c.sortOrder}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => openEdit(c)} className="text-cyan-600 hover:underline text-xs">编辑</button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline text-xs">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

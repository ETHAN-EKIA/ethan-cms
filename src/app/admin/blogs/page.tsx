'use client'

import { useEffect, useState, useRef } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

interface Blog { id: string; title: Record<string, string>; slug: string; status: string; coverImage: string; createdAt: string; author?: { displayName: string } }
interface BlogList { data: Blog[]; total: number; page: number; totalPages: number }
const langs = ['zh', 'en', 'es']

// ── 封面图片上传组件 ──
function CoverUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'blogs')
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || '上传失败')
      onChange(d.url)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex gap-3 items-start">
      {/* 预览 */}
      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
        {value ? (
          <img src={value.startsWith('/') || value.startsWith('http') ? value : `/${value}`} className="w-full h-full object-cover" alt="封面预览" />
        ) : (
          <span className="text-gray-400 text-2xl">🖼️</span>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="粘贴图片URL或点击上传"
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? '⏳ 上传中...' : '📤 上传图片'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')} className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-colors">
              清除
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) handleUpload(e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ slug: '', status: 'DRAFT', coverImage: '', title: { zh: '', en: '', es: '' } as Record<string, string>, excerpt: { zh: '', en: '', es: '' } as Record<string, string>, content: { zh: '', en: '', es: '' } as Record<string, string>, seoTitle: '', seoDesc: '' })
  const [lang, setLang] = useState('en')
  const totalPages = Math.ceil(total / 20)

  const load = () => { apiGet<BlogList>(`/blogs?page=${page}&limit=20`).then(d => { setBlogs(d.data); setTotal(d.total) }).catch(console.error) }
  useEffect(() => { load() }, [page])

  const openNew = () => { setEditId(null); setForm({ slug: '', status: 'DRAFT', coverImage: '', title: { zh: '', en: '', es: '' }, excerpt: { zh: '', en: '', es: '' }, content: { zh: '', en: '', es: '' }, seoTitle: '', seoDesc: '' }); setShowForm(true) }
  const openEdit = (b: Blog) => {
    apiGet<Blog & { excerpt: Record<string, string>; content: Record<string, string>; seoTitle: string; seoDesc: string }>(`/blogs/${b.id}`).then(full => {
      setEditId(b.id); setForm({ slug: full.slug, status: full.status, coverImage: full.coverImage || '', title: full.title as Record<string, string>, excerpt: (full.excerpt || { zh: '', en: '', es: '' }) as Record<string, string>, content: (full.content || { zh: '', en: '', es: '' }) as Record<string, string>, seoTitle: full.seoTitle || '', seoDesc: full.seoDesc || '' }); setShowForm(true)
    })
  }

  const save = async () => {
    if (editId) await apiPut(`/blogs/${editId}`, form); else await apiPost('/blogs', form)
    setShowForm(false); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-gray-800">新闻博客</h1>
        <button onClick={openNew} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">+ 新建文章</button></div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">{editId ? '编辑文章' : '新建文章'}</h2>
          <div className="flex gap-2">{langs.map(l => (
            <button key={l} type="button" onClick={() => setLang(l)} className={`px-3 py-1 text-sm rounded ${lang === l ? 'bg-cyan-600 text-white' : 'bg-gray-100'}`}>{l}</button>
          ))}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-600 mb-1">标题 ({lang})</label>
              <input value={form.title[lang] || ''} onChange={e => setForm({ ...form, title: { ...form.title, [lang]: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">Slug</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">摘要 ({lang})</label>
              <input value={form.excerpt[lang] || ''} onChange={e => setForm({ ...form, excerpt: { ...form.excerpt, [lang]: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">状态</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="DRAFT">草稿</option><option value="PUBLISHED">发布</option><option value="ARCHIVED">归档</option></select></div>
            <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">内容 ({lang})</label>
              <textarea value={form.content[lang] || ''} onChange={e => setForm({ ...form, content: { ...form.content, [lang]: e.target.value } })} rows={6} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">封面图片</label>
              <CoverUploader value={form.coverImage} onChange={url => setForm({ ...form, coverImage: url })} /></div>
            <div><label className="block text-sm text-gray-600 mb-1">SEO 标题</label>
              <input value={form.seoTitle} onChange={e => setForm({ ...form, seoTitle: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2"><button onClick={save} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm">保存</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">取消</button></div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b bg-gray-50">
            <th className="p-3">标题</th><th className="p-3">状态</th><th className="p-3">作者</th><th className="p-3">日期</th><th className="p-3">操作</th>
          </tr></thead>
          <tbody>
            {blogs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">暂无文章</td></tr>}
            {blogs.map(b => (
              <tr key={b.id} className="border-b border-gray-50">
                <td className="p-3"><p className="font-medium">{b.title?.en || b.title?.zh}</p><p className="text-xs text-gray-400">{b.slug}</p></td>
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

'use client'

import { useEffect, useState, useRef } from 'react'
import { apiGet, apiDelete, getToken } from '@/lib/api-client'

interface Media { id: string; url: string; filename: string; mimeType: string; size: number; folder: string; createdAt: string }

export default function MediaPage() {
  const [media, setMedia] = useState<Media[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const limit = 30
  const totalPages = Math.ceil(total / limit)

  const load = () => { apiGet<{ data: Media[]; total: number }>(`/media?page=${page}&limit=${limit}`).then(d => { setMedia(d.data); setTotal(d.total) }).catch(console.error) }
  useEffect(() => { load() }, [page])

  const upload = async (file: File) => {
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'products')
    try {
      await fetch('/api/upload', { method: 'POST', body: fd, headers: { Authorization: `Bearer ${getToken()}` } })
      load()
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); alert('URL 已复制') }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">媒体中心</h1>
        <button onClick={() => fileRef.current?.click()} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700" disabled={loading}>
          {loading ? '上传中...' : '上传文件'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]) }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {media.map(m => (
          <div key={m.id} className="bg-white rounded-xl shadow-sm border p-2 group relative">
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {m.mimeType?.startsWith('image/') ? <img src={m.url} alt={m.filename} className="w-full h-full object-cover" /> : <span className="text-2xl">📄</span>}
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate">{m.filename}</p>
            <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
              <button onClick={() => copyUrl(m.url)} className="bg-white/90 text-xs px-1.5 py-0.5 rounded shadow">复制</button>
              <button onClick={() => { if (confirm('删除？')) apiDelete(`/media/${m.id}`).then(load) }} className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded shadow">删除</button>
            </div>
          </div>
        ))}
        {media.length === 0 && <p className="col-span-6 text-center text-gray-400 py-12">暂无媒体文件</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border p-4">
          <span className="text-sm text-gray-500">共 {total} 个文件</span>
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

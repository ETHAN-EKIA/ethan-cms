'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPut, apiDelete } from '@/lib/api-client'

interface Inquiry {
  id: string; name: string; email: string; country: string; company: string; phone: string;
  whatsapp: string; quantity: string; message: string; status: string; notes: string;
  product?: { id: string; name: Record<string, string> }; createdAt: string
}
interface InquiryList { data: Inquiry[]; total: number; page: number; totalPages: number }

const statuses = ['ALL', 'NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST']
const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700', CONTACTED: 'bg-yellow-100 text-yellow-700',
  QUOTED: 'bg-purple-100 text-purple-700', WON: 'bg-green-100 text-green-700', LOST: 'bg-red-100 text-red-700'
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const totalPages = Math.ceil(total / 20)

  const load = () => {
    const q = statusFilter === 'ALL' ? '' : `&status=${statusFilter}`
    apiGet<InquiryList>(`/inquiries?page=${page}&limit=20${q}`).then(d => { setInquiries(d.data); setTotal(d.total) }).catch(console.error)
  }
  useEffect(() => { load() }, [page, statusFilter])

  const updateStatus = async (id: string, status: string) => { await apiPut(`/inquiries/${id}`, { status }); load() }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">询盘管理</h1>

      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-3 py-1 text-sm rounded-lg ${statusFilter === s ? 'bg-cyan-600 text-white' : 'bg-white border'}`}>{s}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b bg-gray-50">
              <th className="p-3">客户</th><th className="p-3">国家</th><th className="p-3">产品</th>
              <th className="p-3">状态</th><th className="p-3">日期</th><th className="p-3">操作</th>
            </tr></thead>
            <tbody>
              {inquiries.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">暂无询盘</td></tr>}
              {inquiries.map(inq => (
                <tr key={inq.id} className="border-b border-gray-50 cursor-pointer hover:bg-gray-50" onClick={() => setSelected(inq)}>
                  <td className="p-3"><p className="font-medium">{inq.name}</p><p className="text-xs text-gray-400">{inq.email}</p></td>
                  <td className="p-3 text-xs">{inq.country || '-'}</td>
                  <td className="p-3 text-xs">{inq.product?.name?.en || '-'}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[inq.status] || ''}`}>{inq.status}</span></td>
                  <td className="p-3 text-xs text-gray-500">{new Date(inq.createdAt).toLocaleDateString()}</td>
                  <td className="p-3"><select value={inq.status} onChange={e => { e.stopPropagation(); updateStatus(inq.id, e.target.value) }}
                    className="text-xs border rounded px-1 py-0.5" onClick={e => e.stopPropagation()}>
                    {statuses.filter(s => s !== 'ALL').map(s => <option key={s} value={s}>{s}</option>)}
                  </select></td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="p-3 border-t flex justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">上</button>
              <span className="text-sm">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-50">下</button>
            </div>
          )}
        </div>

        {selected && (
          <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">询盘详情</h3>
            <div className="text-sm space-y-2">
              <p><strong>姓名:</strong> {selected.name}</p>
              <p><strong>邮箱:</strong> {selected.email}</p>
              <p><strong>国家:</strong> {selected.country || '-'}</p>
              <p><strong>公司:</strong> {selected.company || '-'}</p>
              <p><strong>电话:</strong> {selected.phone || '-'}</p>
              <p><strong>WhatsApp:</strong> {selected.whatsapp || '-'}</p>
              <p><strong>数量:</strong> {selected.quantity || '-'}</p>
              <p><strong>需求:</strong> {selected.message || '-'}</p>
            </div>
            <button onClick={() => { apiDelete(`/inquiries/${selected.id}`).then(() => { setSelected(null); load() }) }}
              className="text-red-500 text-sm hover:underline">删除询盘</button>
          </div>
        )}
      </div>
    </div>
  )
}

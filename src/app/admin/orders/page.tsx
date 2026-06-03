'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPut } from '@/lib/api-client'

interface Order { id: string; orderNo: string; status: string; totalAmount: number; currency: string; trackingNo: string; createdAt: string; customer?: { name: string }; _count?: { items: number } }
interface OrderList { data: Order[]; total: number; page: number; totalPages: number }

const statuses = ['ALL', 'PENDING', 'PAID', 'PRODUCTION', 'SHIPPED', 'COMPLETED', 'CANCELLED']
const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700', PAID: 'bg-green-100 text-green-700',
  PRODUCTION: 'bg-blue-100 text-blue-700', SHIPPED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-gray-100 text-gray-700', CANCELLED: 'bg-red-100 text-red-700'
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const totalPages = Math.ceil(total / 20)

  const load = () => {
    const q = statusFilter === 'ALL' ? '' : `&status=${statusFilter}`
    apiGet<OrderList>(`/orders?page=${page}&limit=20${q}`).then(d => { setOrders(d.data); setTotal(d.total) }).catch(console.error)
  }
  useEffect(() => { load() }, [page, statusFilter])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">订单管理</h1>
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-3 py-1 text-sm rounded-lg ${statusFilter === s ? 'bg-cyan-600 text-white' : 'bg-white border'}`}>{s}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b bg-gray-50">
            <th className="p-3">订单号</th><th className="p-3">客户</th><th className="p-3">金额</th>
            <th className="p-3">状态</th><th className="p-3">物流单号</th><th className="p-3">日期</th><th className="p-3">操作</th>
          </tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">暂无订单</td></tr>}
            {orders.map(o => (
              <tr key={o.id} className="border-b border-gray-50">
                <td className="p-3 font-mono text-xs">{o.orderNo}</td>
                <td className="p-3">{o.customer?.name || '-'}</td>
                <td className="p-3">${Number(o.totalAmount).toFixed(2)} {o.currency}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[o.status] || ''}`}>{o.status}</span></td>
                <td className="p-3 text-xs">{o.trackingNo || '-'}</td>
                <td className="p-3 text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="p-3"><select value={o.status} onChange={e => apiPut(`/orders/${o.id}`, { status: e.target.value }).then(load)}
                  className="text-xs border rounded px-1 py-0.5">
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
    </div>
  )
}

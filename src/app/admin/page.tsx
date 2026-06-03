'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api-client'

interface Stats {
  stats: { productCount: number; inquiryCount: number; customerCount: number; orderCount: number }
  recentInquiries: Array<{ id: string; name: string; email: string; country: string; status: string; createdAt: string; product?: { name: Record<string, string> } }>
  inquiryByStatus: Array<{ status: string; _count: number }>
  recentOrders: Array<{ id: string; orderNo: string; status: string; totalAmount: number; createdAt: string; customer?: { name: string } }>
}

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-yellow-100 text-yellow-700',
  QUOTED: 'bg-purple-100 text-purple-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  PRODUCTION: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-gray-100 text-gray-700',
}

export default function DashboardPage() {
  const [data, setData] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<Stats>('/dashboard/stats').then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" /></div>
  if (!data) return <div className="text-center py-20 text-gray-500">加载失败</div>

  const cards = [
    { label: '产品总数', value: data.stats.productCount, color: 'bg-blue-500', icon: '📦' },
    { label: '询盘总数', value: data.stats.inquiryCount, color: 'bg-green-500', icon: '📧' },
    { label: '客户总数', value: data.stats.customerCount, color: 'bg-purple-500', icon: '👥' },
    { label: '订单总数', value: data.stats.orderCount, color: 'bg-orange-500', icon: '🛒' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-xl`}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inquiries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">最新询盘</h2>
            <a href="/admin/inquiries" className="text-sm text-cyan-600 hover:underline">查看全部</a>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentInquiries.length === 0 && <p className="p-4 text-sm text-gray-400">暂无询盘</p>}
            {data.recentInquiries.map(inq => (
              <div key={inq.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{inq.name}</p>
                  <p className="text-xs text-gray-500">{inq.country} · {inq.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[inq.status] || 'bg-gray-100'}`}>{inq.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inquiry Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">询盘状态分布</h2>
          </div>
          <div className="p-4 space-y-3">
            {data.inquiryByStatus.length === 0 && <p className="text-sm text-gray-400">暂无数据</p>}
            {data.inquiryByStatus.map(item => (
              <div key={item.status} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[item.status] || 'bg-gray-100'}`}>{item.status}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${data.stats.inquiryCount ? (item._count / data.stats.inquiryCount * 100) : 0}%` }} />
                </div>
                <span className="text-sm font-medium">{item._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">最近订单</h2>
          <a href="/admin/orders" className="text-sm text-cyan-600 hover:underline">查看全部</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="p-3 font-medium">订单号</th><th className="p-3 font-medium">客户</th>
              <th className="p-3 font-medium">金额</th><th className="p-3 font-medium">状态</th><th className="p-3 font-medium">日期</th>
            </tr></thead>
            <tbody>
              {data.recentOrders.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">暂无订单</td></tr>}
              {data.recentOrders.map(order => (
                <tr key={order.id} className="border-b border-gray-50">
                  <td className="p-3 font-mono text-xs">{order.orderNo}</td>
                  <td className="p-3">{order.customer?.name || '-'}</td>
                  <td className="p-3">${Number(order.totalAmount).toFixed(2)}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-100'}`}>{order.status}</span></td>
                  <td className="p-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

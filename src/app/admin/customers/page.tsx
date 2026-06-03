'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

interface Customer { id: string; name: string; country: string; email: string; company: string; whatsapp: string; phone: string; totalOrders: number; totalAmount: number; notes: string; tags: string }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({ name: '', country: '', email: '', company: '', whatsapp: '', phone: '', notes: '', tags: '' })

  const load = () => { apiGet<{ data: Customer[] }>('/customers').then(d => setCustomers(d.data)).catch(console.error) }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditId(null); setForm({ name: '', country: '', email: '', company: '', whatsapp: '', phone: '', notes: '', tags: '' }); setShowForm(true) }
  const openEdit = (c: Customer) => { setEditId(c.id); setForm({ name: c.name, country: c.country || '', email: c.email || '', company: c.company || '', whatsapp: c.whatsapp || '', phone: c.phone || '', notes: c.notes || '', tags: c.tags || '' }); setShowForm(true) }

  const save = async () => {
    if (editId) await apiPut(`/customers/${editId}`, form); else await apiPost('/customers', form)
    setShowForm(false); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-gray-800">客户管理</h1>
        <button onClick={openNew} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">+ 新增客户</button></div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">{editId ? '编辑客户' : '新增客户'}</h2>
          <div className="grid grid-cols-2 gap-4">
            {['name', 'email', 'country', 'company', 'whatsapp', 'phone', 'tags'].map(f => (
              <div key={f}><label className="block text-sm text-gray-600 mb-1 capitalize">{f}</label>
                <input value={form[f] || ''} onChange={e => setForm({ ...form, [f]: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            ))}
            <div className="col-span-2"><label className="block text-sm text-gray-600 mb-1">备注</label>
              <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2"><button onClick={save} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm">保存</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">取消</button></div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b bg-gray-50">
            <th className="p-3">名称</th><th className="p-3">国家</th><th className="p-3">邮箱</th><th className="p-3">公司</th>
            <th className="p-3">订单数</th><th className="p-3">总金额</th><th className="p-3">操作</th>
          </tr></thead>
          <tbody>
            {customers.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400">暂无客户</td></tr>}
            {customers.map(c => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="p-3 font-medium">{c.name}</td><td className="p-3">{c.country || '-'}</td>
                <td className="p-3">{c.email || '-'}</td><td className="p-3">{c.company || '-'}</td>
                <td className="p-3">{c.totalOrders}</td><td className="p-3">${Number(c.totalAmount).toFixed(2)}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => openEdit(c)} className="text-cyan-600 hover:underline text-xs">编辑</button>
                  <button onClick={() => { if (confirm('确定删除？')) apiDelete(`/customers/${c.id}`).then(load) }} className="text-red-500 hover:underline text-xs">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

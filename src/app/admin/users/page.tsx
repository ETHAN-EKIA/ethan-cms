'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'

interface User { id: string; username: string; email: string; displayName: string; role: string; createdAt: string }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ username: '', password: '', email: '', displayName: '', role: 'EDITOR' })

  const load = () => { apiGet<User[]>('/users').then(setUsers).catch(console.error) }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditId(null); setForm({ username: '', password: '', email: '', displayName: '', role: 'EDITOR' }); setShowForm(true) }
  const openEdit = (u: User) => { setEditId(u.id); setForm({ username: u.username, password: '', email: u.email || '', displayName: u.displayName || '', role: u.role }); setShowForm(true) }

  const save = async () => {
    const data: Record<string, string> = { ...form }
    if (editId && !data.password) delete data.password
    if (editId) await apiPut(`/users/${editId}`, data); else await apiPost('/users', data)
    setShowForm(false); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
        <button onClick={openNew} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700">+ 新增用户</button></div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h2 className="font-semibold">{editId ? '编辑用户' : '新增用户'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-gray-600 mb-1">用户名</label><input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">{editId ? '新密码 (留空不修改)' : '密码'}</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">邮箱</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">显示名</label><input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm text-gray-600 mb-1">角色</label><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="ADMIN">管理员</option><option value="SALES">销售</option><option value="EDITOR">编辑</option></select></div>
          </div>
          <div className="flex gap-2"><button onClick={save} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm">保存</button><button onClick={() => setShowForm(false)} className="bg-gray-200 px-4 py-2 rounded-lg text-sm">取消</button></div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b bg-gray-50"><th className="p-3">用户名</th><th className="p-3">显示名</th><th className="p-3">邮箱</th><th className="p-3">角色</th><th className="p-3">创建时间</th><th className="p-3">操作</th></tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id} className="border-b border-gray-50">
              <td className="p-3 font-medium">{u.username}</td><td className="p-3">{u.displayName || '-'}</td><td className="p-3">{u.email || '-'}</td>
              <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : u.role === 'SALES' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
              <td className="p-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
              <td className="p-3 flex gap-2"><button onClick={() => openEdit(u)} className="text-cyan-600 hover:underline text-xs">编辑</button>
                {u.role !== 'ADMIN' && <button onClick={() => { if (confirm('删除？')) apiDelete(`/users/${u.id}`).then(load) }} className="text-red-500 hover:underline text-xs">删除</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useState, FormEvent } from 'react'
import { setUser } from '@/lib/api-client'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登录失败')
      setUser(data.user)
      // 使用硬跳转确保浏览器携带新设置的 auth_token cookie 请求 /admin
      window.location.href = '/admin'
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">ETHAN</h1>
          <p className="text-cyan-600 font-medium mt-1">Security Camera CMS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              placeholder="admin" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              placeholder="••••••••" required />
          </div>

          {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full bg-cyan-600 text-white py-2.5 rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50">
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">ETHAN Security Camera Management System</p>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPut } from '@/lib/api-client'

interface Setting { id: string; key: string; value: unknown }

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const data = await apiGet<Setting[]>('/settings')
    const map: Record<string, string> = {}
    data.forEach(s => { map[s.key] = typeof s.value === 'string' ? s.value : JSON.stringify(s.value) })
    setSettings(map); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    const items = Object.entries(settings).map(([key, value]) => {
      let parsed: unknown = value
      try { parsed = JSON.parse(value) } catch { /* keep as string */ }
      return { key, value: parsed }
    })
    await apiPut('/settings', items)
    setSaving(false)
    alert('设置已保存')
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" /></div>

  const fields = [
    { key: 'siteName', label: '网站名称' },
    { key: 'siteDescription', label: '网站描述' },
    { key: 'contactEmail', label: '联系邮箱' },
    { key: 'contactPhone', label: '联系电话' },
    { key: 'contactWhatsapp', label: 'WhatsApp' },
    { key: 'address', label: '地址' }
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">站点设置</h1>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-sm text-gray-600 mb-1">{f.label}</label>
            <input value={settings[f.key] || ''} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        ))}
        <button onClick={save} disabled={saving} className="bg-cyan-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50">
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  )
}

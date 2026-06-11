'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPut } from '@/lib/api-client'

interface Setting { id: string; key: string; value: unknown }

const langs = ['en', 'zh', 'es']
const langLabels: Record<string, string> = { en: 'English', zh: '中文', es: 'Español' }

// 判断值是否为多语言 JSON 对象
function isMultiLang(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value as Record<string, unknown>)
  return keys.some(k => ['en', 'zh', 'es'].includes(k))
}

interface FieldDef {
  key: string
  label: string
  multiline?: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const load = async () => {
    const data = await apiGet<Setting[]>('/settings')
    setSettings(data)
    setLoading(false)
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const getSettingValue = (key: string): unknown => {
    return settings.find(s => s.key === key)?.value
  }

  const setSettingValue = (key: string, value: unknown) => {
    setSettings(prev => {
      const idx = prev.findIndex(s => s.key === key)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], value }
        return updated
      }
      return [...prev, { id: '', key, value }]
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const items = settings.map(s => ({ key: s.key, value: s.value }))
      await apiPut('/settings', items)
      showToast('设置已保存')
    } catch (e: unknown) {
      showToast((e as Error).message || '保存失败')
    }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" /></div>

  const fields: FieldDef[] = [
    { key: 'siteName', label: '网站名称' },
    { key: 'siteDescription', label: '网站描述', multiline: true },
    { key: 'contactEmail', label: '联系邮箱' },
    { key: 'contactPhone', label: '联系电话' },
    { key: 'contactWhatsapp', label: 'WhatsApp' },
    { key: 'address', label: '地址', multiline: true }
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">站点设置</h1>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg text-sm animate-pulse">
          {toast}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        {fields.map(f => {
          const value = getSettingValue(f.key)
          const multi = isMultiLang(value)

          return (
            <div key={f.key} className="border-b border-gray-100 pb-4 last:border-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">{f.label}</label>
              {multi ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {langs.map(lang => (
                    <div key={lang}>
                      <span className="text-xs text-gray-400 mb-1 block">{langLabels[lang]}</span>
                      {f.multiline ? (
                        <textarea
                          value={(value as Record<string, string>)[lang] || ''}
                          onChange={e => {
                            const updated = { ...(value as Record<string, string>), [lang]: e.target.value }
                            setSettingValue(f.key, updated)
                          }}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                      ) : (
                        <input
                          value={(value as Record<string, string>)[lang] || ''}
                          onChange={e => {
                            const updated = { ...(value as Record<string, string>), [lang]: e.target.value }
                            setSettingValue(f.key, updated)
                          }}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                f.multiline ? (
                  <textarea
                    value={typeof value === 'string' ? value : ''}
                    onChange={e => setSettingValue(f.key, e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                ) : (
                  <input
                    value={typeof value === 'string' ? value : ''}
                    onChange={e => setSettingValue(f.key, e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                )
              )}
            </div>
          )
        })}
        <button onClick={save} disabled={saving} className="bg-cyan-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50">
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  )
}

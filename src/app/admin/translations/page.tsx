'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '@/lib/api-client'

interface Translation { id: string; key: string; locale: string; value: string }
const locales = ['zh', 'en', 'es']

export default function TranslationsPage() {
  const [translations, setTranslations] = useState<Translation[]>([])
  const [filter, setFilter] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newValues, setNewValues] = useState<Record<string, string>>({ zh: '', en: '', es: '' })

  const load = () => { apiGet<Translation[]>('/translations').then(setTranslations).catch(console.error) }
  useEffect(() => { load() }, [])

  const addTranslation = async () => {
    if (!newKey) return
    for (const locale of locales) {
      if (newValues[locale]) await apiPost('/translations', { key: newKey, locale, value: newValues[locale] })
    }
    setNewKey(''); setNewValues({ zh: '', en: '', es: '' }); load()
  }

  const grouped = translations.reduce<Record<string, Record<string, string>>>((acc, t) => {
    if (filter && !t.key.includes(filter)) return acc
    if (!acc[t.key]) acc[t.key] = {}
    acc[t.key][t.locale] = t.value
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">多语言翻译</h1>

      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
        <h3 className="font-semibold text-sm">新增翻译</h3>
        <div className="grid grid-cols-4 gap-3">
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="翻译键 (如 nav.home)" className="px-3 py-2 border rounded-lg text-sm" />
          {locales.map(l => (<input key={l} value={newValues[l] || ''} onChange={e => setNewValues({ ...newValues, [l]: e.target.value })} placeholder={l} className="px-3 py-2 border rounded-lg text-sm" />))}
        </div>
        <button onClick={addTranslation} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm">添加</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b"><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="搜索键名..." className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 border-b bg-gray-50"><th className="p-3">Key</th>{locales.map(l => (<th key={l} className="p-3">{l}</th>))}</tr></thead>
          <tbody>
            {Object.entries(grouped).map(([key, vals]) => (
              <tr key={key} className="border-b border-gray-50">
                <td className="p-3 font-mono text-xs">{key}</td>
                {locales.map(l => (<td key={l} className="p-3 text-xs">{vals[l] || <span className="text-gray-300">-</span>}</td>))}
              </tr>
            ))}
            {Object.keys(grouped).length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">暂无翻译</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

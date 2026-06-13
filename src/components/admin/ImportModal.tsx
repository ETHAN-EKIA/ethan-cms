'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'

/* ── 字段映射配置 ── */
const FIELD_MAP: Record<string, string> = {
  '产品名称': 'name.zh', '产品名称(中文)': 'name.zh', '产品名': 'name.zh',
  'Product Name': 'name.en', 'product name': 'name.en',
  'Nombre': 'name.es', '产品名称(西)': 'name.es',
  'Slug': 'slug', 'slug': 'slug',
  'SKU': 'sku', 'sku': 'sku', '型号': 'sku',
  '品牌': 'brand', 'Brand': 'brand', 'brand': 'brand',
  '分类': 'categoryId', 'Category': 'categoryId',
  '价格': 'price', 'Price': 'price', 'price': 'price', '单价': 'price',
  '库存': 'stock', 'Stock': 'stock', 'stock': 'stock',
  'MOQ': 'moq', 'moq': 'moq', '起订量': 'moq',
  '标签': 'badge', 'Badge': 'badge', 'badge': 'badge',
  '状态': 'status', 'Status': 'status',
  '产品简介': 'summary.zh', '产品简介(中文)': 'summary.zh',
  'Summary': 'summary.en', 'summary': 'summary.en',
  'Resumen': 'summary.es',
  'SEO标题': 'seoTitle', 'SEO Title': 'seoTitle',
  'SEO描述': 'seoDesc', 'SEO Description': 'seoDesc',
  'SEO关键词': 'seoKeywords', 'SEO Keywords': 'seoKeywords',
}

interface ImportModalProps {
  onFill: (data: Record<string, unknown>) => void
  onBatchImport: (rows: Record<string, unknown>[]) => Promise<void>
  onClose: () => void
}

export default function ImportModal({ onFill, onBatchImport, onClose }: ImportModalProps) {
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [previewRow, setPreviewRow] = useState<number>(0)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [batchImporting, setBatchImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const parseFile = useCallback(async (file: File) => {
    setStatus('解析中...')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      if (!data.length) { setStatus('表格为空'); return }

      const cols = Object.keys(data[0])
      setColumns(cols)
      setParsedRows(data)

      // 自动映射
      const autoMap: Record<string, string> = {}
      cols.forEach(col => {
        const key = col.trim()
        for (const [pattern, field] of Object.entries(FIELD_MAP)) {
          if (key.toLowerCase() === pattern.toLowerCase() || key.includes(pattern)) {
            autoMap[key] = field; break
          }
        }
      })
      // 亮点/参数 特殊处理
      cols.forEach(col => {
        if (/亮点\d+/.test(col)) { const n = col.match(/\d+/)?.[0]; autoMap[col] = `highlights.${Number(n)-1}.zh` }
        if (/参数名\d*/.test(col)) { const n = col.match(/\d+/)?.[0] || '0'; autoMap[col] = `details.${Number(n)}.0.zh` }
        if (/参数值\d*/.test(col)) { const n = col.match(/\d+/)?.[0] || '0'; autoMap[col] = `details.${Number(n)}.1.zh` }
      })

      setMapping(autoMap)
      setPreviewRow(0)
      setStatus(`解析完成：${data.length} 条记录，${cols.length} 列`)
    } catch (e) {
      setStatus('解析失败：' + (e as Error).message)
    }
  }, [])

  const fillFormFromRow = (row: Record<string, unknown>) => {
    const formData: Record<string, unknown> = {
      name: { zh: '', en: '', es: '' },
      summary: { zh: '', en: '', es: '' },
      highlights: [] as Array<Record<string, string>>,
      details: [] as Array<Array<Record<string, string>>>,
    }
    const hlMap: Record<number, Record<string, string>> = {}
    const dtMap: Record<number, [Record<string,string>, Record<string,string>]> = {}

    for (const [col, field] of Object.entries(mapping)) {
      let val = row[col] ?? ''
      if (typeof val !== 'string') val = String(val)

      if (field.startsWith('highlights.')) {
        const [, idx, lang] = field.split('.')
        const i = parseInt(idx)
        if (!hlMap[i]) hlMap[i] = { zh: '', en: '', es: '' }
        hlMap[i][lang || 'zh'] = val
      } else if (field.startsWith('details.')) {
        const [, idx, pos, lang] = field.split('.')
        const i = parseInt(idx)
        if (!dtMap[i]) dtMap[i] = [{ zh:'',en:'',es:'' }, { zh:'',en:'',es:'' }]
        dtMap[i][parseInt(pos)][lang || 'zh'] = val
      } else if (field.includes('.')) {
        // nested: name.zh, summary.en
        const [parent, key] = field.split('.')
        const existing = (formData[parent] as Record<string,string>) || {}
        existing[key] = val
        formData[parent] = existing
      } else {
        // flat: slug, sku, price...
        if (field === 'price' || field === 'stock' || field === 'moq') {
          formData[field] = parseFloat(val) || 0
        } else {
          formData[field] = val
        }
      }
    }

    // Build highlights array
    const hlKeys = Object.keys(hlMap).sort()
    if (hlKeys.length) formData.highlights = hlKeys.map(k => hlMap[parseInt(k)])
    else formData.highlights = [{ zh: '', en: '', es: '' }]

    // Build details array
    const dtKeys = Object.keys(dtMap).sort()
    if (dtKeys.length) formData.details = dtKeys.map(k => dtMap[parseInt(k)])

    return formData
  }

  const handleFillSingle = () => {
    const data = fillFormFromRow(parsedRows[previewRow])
    onFill(data)
    setStatus('已填入表单')
    onClose()
  }

  const handleBatchImport = async () => {
    setBatchImporting(true)
    try {
      const rows = parsedRows.map(r => fillFormFromRow(r))
      await onBatchImport(rows)
      setStatus(`批量导入完成：${rows.length} 条`)
      onClose()
    } catch (e) {
      setStatus('批量导入失败：' + (e as Error).message)
    } finally { setBatchImporting(false) }
  }

  const currentRow = parsedRows[previewRow] || {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-800">📊 上传表格导入</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Upload */}
          {parsedRows.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-[#0066FF]/40 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = '' }} />
              <span className="text-4xl">📁</span>
              <p className="mt-3 text-gray-600 font-medium">点击选择 Excel/CSV 文件</p>
              <p className="text-xs text-gray-400 mt-1">支持 .xlsx / .csv，最大 10MB</p>
            </div>
          ) : (
            <>
              {/* Mode & Status */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button onClick={() => setMode('single')}
                    className={`px-3 py-1.5 text-sm rounded-lg ${mode === 'single' ? 'bg-[#0066FF] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    单条导入
                  </button>
                  <button onClick={() => setMode('batch')}
                    className={`px-3 py-1.5 text-sm rounded-lg ${mode === 'batch' ? 'bg-[#0066FF] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    批量导入 ({parsedRows.length}条)
                  </button>
                </div>
                <button onClick={() => { setParsedRows([]); setColumns([]); setMapping({}); setStatus('') }}
                  className="text-sm text-gray-400 hover:text-gray-600">重新选择</button>
              </div>

              {status && <div className="text-sm px-3 py-2 rounded-lg bg-blue-50 text-blue-700">{status}</div>}

              {/* Column Mapping Table */}
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 w-1/4">表格列名</th>
                      <th className="px-3 py-2 text-left text-gray-500 w-1/4">映射字段</th>
                      <th className="px-3 py-2 text-left text-gray-500">预览值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map(col => (
                      <tr key={col} className="border-t">
                        <td className="px-3 py-2 font-medium text-gray-700">{col}</td>
                        <td className="px-3 py-2">
                          <select value={mapping[col] || ''}
                            onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value }))}
                            className="w-full px-2 py-1 border rounded text-xs">
                            <option value="">-- 跳过 --</option>
                            {Object.entries({ ...FIELD_MAP, '亮点1':'highlights.0.zh','亮点2':'highlights.1.zh','亮点3':'highlights.2.zh','亮点4':'highlights.3.zh','参数名1':'details.0.0.zh','参数值1':'details.0.1.zh','参数名2':'details.1.0.zh','参数值2':'details.1.1.zh' })
                              .map(([k, v]) => <option key={v} value={v}>{k} → {v}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{String(currentRow[col] ?? '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Row selector (single mode) */}
              {mode === 'single' && parsedRows.length > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">选择行：</span>
                  <select value={previewRow} onChange={e => setPreviewRow(parseInt(e.target.value))}
                    className="px-3 py-1.5 border rounded-lg text-sm">
                    {parsedRows.map((_, i) => (
                      <option key={i} value={i}>第 {i + 1} 行 {String(parsedRows[i][columns[0]] || '').slice(0, 30)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                {mode === 'single' ? (
                  <button onClick={handleFillSingle}
                    className="px-5 py-2 text-sm font-medium text-white bg-[#0066FF] rounded-lg hover:bg-[#267FFF]">
                    填入表单
                  </button>
                ) : (
                  <button onClick={handleBatchImport} disabled={batchImporting}
                    className="px-5 py-2 text-sm font-medium text-white bg-[#0066FF] rounded-lg hover:bg-[#267FFF] disabled:opacity-50">
                    {batchImporting ? '导入中...' : `批量导入 ${parsedRows.length} 条`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

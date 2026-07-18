'use client'

import { useMemo, useState } from 'react'

export type SpreadsheetValue = string | number | null

export interface SpreadsheetColumn {
  id: string
  label: string
}

export interface SpreadsheetSheet {
  name: string
  columns: SpreadsheetColumn[]
  rows: Record<string, SpreadsheetValue>[]
}

function cloneSheets(sheets: SpreadsheetSheet[]): SpreadsheetSheet[] {
  return sheets.map((sheet) => ({
    ...sheet,
    columns: sheet.columns.map((column) => ({ ...column })),
    rows: sheet.rows.map((row) => ({ ...row })),
  }))
}

function safeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[\\/*?:[\]]/g, '').slice(0, 31)
  return cleaned || `Sheet ${index + 1}`
}

export default function ExcelPreviewModal({
  sheets,
  filename,
  onClose,
}: {
  sheets: SpreadsheetSheet[]
  filename: string
  onClose: () => void
}) {
  const initialSheets = useMemo(() => cloneSheets(sheets), [sheets])
  const [editableSheets, setEditableSheets] = useState(initialSheets)
  const [activeIndex, setActiveIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const activeSheet = editableSheets[activeIndex]

  const updateColumn = (columnId: string, label: string) => {
    setEditableSheets((current) => current.map((sheet, index) => index === activeIndex
      ? { ...sheet, columns: sheet.columns.map((column) => column.id === columnId ? { ...column, label } : column) }
      : sheet))
  }

  const updateCell = (rowIndex: number, columnId: string, value: string) => {
    setEditableSheets((current) => current.map((sheet, index) => index === activeIndex
      ? {
          ...sheet,
          rows: sheet.rows.map((row, index) => index === rowIndex ? { ...row, [columnId]: value } : row),
        }
      : sheet))
  }

  const addColumn = () => {
    const id = `custom_${Date.now()}`
    setEditableSheets((current) => current.map((sheet, index) => index === activeIndex
      ? {
          ...sheet,
          columns: [...sheet.columns, { id, label: 'عمود جديد' }],
          rows: sheet.rows.map((row) => ({ ...row, [id]: '' })),
        }
      : sheet))
  }

  const deleteColumn = (columnId: string) => {
    if (activeSheet.columns.length === 1) return
    setEditableSheets((current) => current.map((sheet, index) => index === activeIndex
      ? {
          ...sheet,
          columns: sheet.columns.filter((column) => column.id !== columnId),
          rows: sheet.rows.map((row) => {
            const next = { ...row }
            delete next[columnId]
            return next
          }),
        }
      : sheet))
  }

  const exportWorkbook = async () => {
    setExporting(true)
    setError('')
    try {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'زمزم'
      workbook.created = new Date()

      editableSheets.forEach((sheet, sheetIndex) => {
        const worksheet = workbook.addWorksheet(safeSheetName(sheet.name, sheetIndex), {
          views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
        })
        worksheet.columns = sheet.columns.map((column) => ({
          header: column.label,
          key: column.id,
          width: Math.min(40, Math.max(14, column.label.length + 4)),
        }))
        sheet.rows.forEach((row) => {
          const values: Record<string, SpreadsheetValue> = {}
          sheet.columns.forEach((column) => { values[column.id] = row[column.id] ?? '' })
          worksheet.addRow(values)
        })
        worksheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0891B2' } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        })
        worksheet.eachRow((row) => {
          row.alignment = { horizontal: 'right', vertical: 'middle' }
        })
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: sheet.columns.length },
        }
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      onClose()
    } catch {
      setError('تعذر إنشاء ملف Excel. حاول مرة أخرى.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="mobile-sheet glass-strong rounded-2xl p-4 sm:p-6 w-full max-w-6xl mx-3 max-h-[92vh] flex flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-deep-800">معاينة Excel وتعديله</h2>
            <p className="text-xs text-deep-500 mt-1">يمكنك تعديل الخلايا والعناوين وإضافة أو حذف الأعمدة قبل التنزيل.</p>
          </div>
          <button type="button" onClick={onClose} className="text-deep-400 hover:text-deep-700" aria-label="إغلاق">✕</button>
        </div>

        {editableSheets.length > 1 && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {editableSheets.map((sheet, index) => (
              <button
                type="button"
                key={`${sheet.name}-${index}`}
                onClick={() => setActiveIndex(index)}
                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${activeIndex === index ? 'water-btn text-white' : 'water-btn-outline'}`}
              >
                {sheet.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto border border-water-200/60 rounded-xl bg-white/50 dark:bg-slate-900/40">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="bg-water-100 dark:bg-slate-800 border border-water-200 p-2 w-12">#</th>
                {activeSheet.columns.map((column) => (
                  <th key={column.id} className="bg-water-100 dark:bg-slate-800 border border-water-200 p-2 min-w-[150px]">
                    <div className="flex gap-2">
                      <input
                        value={column.label}
                        onChange={(event) => updateColumn(column.id, event.target.value)}
                        className="surface-field min-w-0 flex-1 rounded-md px-2 py-1 font-semibold"
                        aria-label="عنوان العمود"
                      />
                      <button
                        type="button"
                        onClick={() => deleteColumn(column.id)}
                        disabled={activeSheet.columns.length === 1}
                        className="text-red-500 disabled:opacity-30"
                        title="حذف العمود"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeSheet.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="border border-water-200 p-2 text-center text-deep-500">{rowIndex + 1}</td>
                  {activeSheet.columns.map((column) => (
                    <td key={column.id} className="border border-water-200 p-1">
                      <input
                        value={row[column.id] ?? ''}
                        onChange={(event) => updateCell(rowIndex, column.id, event.target.value)}
                        className="w-full min-w-[140px] bg-transparent px-2 py-1.5 outline-none focus:bg-cyan-50 dark:focus:bg-slate-800"
                        aria-label={`${column.label}، الصف ${rowIndex + 1}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <div className="flex flex-wrap justify-between gap-3 mt-4">
          <button type="button" onClick={addColumn} className="water-btn-outline rounded-lg px-4 py-2 text-sm font-medium">
            + إضافة عمود
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="water-btn-outline rounded-lg px-4 py-2 text-sm">إلغاء</button>
            <button type="button" onClick={exportWorkbook} disabled={exporting} className="water-btn text-white rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {exporting ? 'جاري الإنشاء...' : 'تنزيل Excel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

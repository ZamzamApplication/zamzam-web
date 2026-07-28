'use client'

import { useState } from 'react'

export type SpreadsheetValue = string | number | null

export interface SpreadsheetColumn {
  id: string
  label: string
  width?: number
  groupId?: string
  groupLabel?: string
}

export interface SpreadsheetSheet {
  name: string
  columns: SpreadsheetColumn[]
  rows: Record<string, SpreadsheetValue>[]
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
  const [activeIndex, setActiveIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const activeSheet = sheets[activeIndex]
  const hierarchical = activeSheet.columns.some((column) => column.groupId)

  const exportWorkbook = async () => {
    setExporting(true)
    setError('')
    try {
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'زمزم'
      workbook.created = new Date()

      sheets.forEach((sheet, sheetIndex) => {
        const hierarchical = sheet.columns.some((column) => column.groupId)
        const headerRows = hierarchical ? 2 : 1
        const worksheet = workbook.addWorksheet(safeSheetName(sheet.name, sheetIndex), {
          views: [{ rightToLeft: true, state: 'frozen', ySplit: headerRows }],
        })
        worksheet.columns = sheet.columns.map((column) => ({
          key: column.id,
          width: column.width ?? Math.min(40, Math.max(14, column.label.length + 4)),
        }))
        if (hierarchical) {
          worksheet.addRow(sheet.columns.map(() => ''))
          worksheet.addRow(sheet.columns.map(() => ''))
          for (let index = 0; index < sheet.columns.length;) {
            const column = sheet.columns[index]
            const excelColumn = index + 1
            if (!column.groupId) {
              worksheet.getCell(1, excelColumn).value = column.label
              worksheet.mergeCells(1, excelColumn, 2, excelColumn)
              index += 1
              continue
            }
            let end = index
            while (end + 1 < sheet.columns.length && sheet.columns[end + 1].groupId === column.groupId) end += 1
            worksheet.getCell(1, excelColumn).value = column.groupLabel || column.label
            if (end > index) worksheet.mergeCells(1, excelColumn, 1, end + 1)
            for (let childIndex = index; childIndex <= end; childIndex++) {
              worksheet.getCell(2, childIndex + 1).value = sheet.columns[childIndex].label
            }
            index = end + 1
          }
        } else {
          worksheet.addRow(sheet.columns.map((column) => column.label))
        }
        sheet.rows.forEach((row) => {
          const values: Record<string, SpreadsheetValue> = {}
          sheet.columns.forEach((column) => { values[column.id] = row[column.id] ?? '' })
          worksheet.addRow(values)
        })
        for (let rowNumber = 1; rowNumber <= headerRows; rowNumber++) {
          worksheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0891B2' } }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
          })
        }
        for (let rowNumber = headerRows + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
          worksheet.getRow(rowNumber).alignment = { horizontal: 'right', vertical: 'middle' }
        }
        if (!hierarchical) {
          worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: sheet.columns.length },
          }
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
            <h2 className="text-lg font-bold text-deep-800">معاينة Excel</h2>
            <p className="text-xs text-deep-500 mt-1">
              الأعمدة والعناوين محفوظة في <a href="/settings" className="font-semibold text-cyan-700 underline dark:text-cyan-300">إعدادات قوالب Excel</a>.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-deep-400 hover:text-deep-700" aria-label="إغلاق">✕</button>
        </div>

        {sheets.length > 1 && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {sheets.map((sheet, index) => (
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
                <th rowSpan={hierarchical ? 2 : 1} className="bg-water-100 dark:bg-slate-800 border border-water-200 p-2 w-12">#</th>
                {activeSheet.columns.map((column, index) => {
                  if (!hierarchical) {
                    return (
                      <th key={column.id} className="bg-water-100 dark:bg-slate-800 border border-water-200 p-2" style={{ minWidth: `${(column.width ?? 18) * 8}px` }}>
                        {column.label}
                      </th>
                    )
                  }
                  if (!column.groupId) {
                    return (
                      <th key={column.id} rowSpan={2} className="bg-water-100 dark:bg-slate-800 border border-water-200 p-2" style={{ minWidth: `${(column.width ?? 18) * 8}px` }}>
                        {column.label}
                      </th>
                    )
                  }
                  if (index > 0 && activeSheet.columns[index - 1].groupId === column.groupId) return null
                  let span = 1
                  while (index + span < activeSheet.columns.length && activeSheet.columns[index + span].groupId === column.groupId) span += 1
                  return <th key={column.groupId} colSpan={span} className="border border-water-200 bg-cyan-700 p-2 text-white">{column.groupLabel}</th>
                })}
              </tr>
              {hierarchical && (
                <tr>
                  {activeSheet.columns.filter((column) => column.groupId).map((column) => (
                    <th key={column.id} className="bg-water-100 dark:bg-slate-800 border border-water-200 p-2" style={{ minWidth: `${(column.width ?? 18) * 8}px` }}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {activeSheet.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="border border-water-200 p-2 text-center text-deep-500">{rowIndex + 1}</td>
                  {activeSheet.columns.map((column) => (
                    <td
                      key={column.id}
                      className="border border-water-200 px-3 py-2 text-deep-700"
                      style={{ minWidth: `${(column.width ?? 18) * 8}px` }}
                    >
                      {row[column.id] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
        <div className="flex justify-end gap-3 mt-4">
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

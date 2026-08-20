'use client'

import { useState } from 'react'

export type SpreadsheetValue = string | number | null

export interface SpreadsheetColumn {
  id: string
  label: string
  width?: number
  groupId?: string
  groupLabel?: string
  dateValue?: string
  headerFontSize?: number
}

export interface SpreadsheetSheet {
  name: string
  columns: SpreadsheetColumn[]
  rows: Record<string, SpreadsheetValue>[]
  headerFontFamily?: string
  headerFontSize?: number
  headerBold?: boolean
  headerBackgroundColor?: string
  headerFontColor?: string
  cellFontFamily?: string
  cellFontSize?: number
  cellBold?: boolean
  cellFontColor?: string
  dateFontFamily?: string
  dateFontSize?: number
  dateBold?: boolean
  dateFontColor?: string
}

function safeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[\\/*?:[\]]/g, '').slice(0, 31)
  return cleaned || `Sheet ${index + 1}`
}

export default function ExcelPreviewModal({
  sheets,
  filename,
  helpText,
  onClose,
}: {
  sheets: SpreadsheetSheet[]
  filename: string
  helpText?: string
  onClose: () => void
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const activeSheet = sheets[activeIndex]
  const hierarchical = activeSheet.columns.some((column) => column.groupId)
  const headerStyle = {
    backgroundColor: activeSheet.headerBackgroundColor || '#FFFFFF',
    color: activeSheet.headerFontColor || '#000000',
    fontFamily: activeSheet.headerFontFamily || 'Arial',
    fontSize: `${activeSheet.headerFontSize || 12}pt`,
    fontWeight: activeSheet.headerBold === false ? 400 : 700,
  }
  const cellStyle = {
    color: activeSheet.cellFontColor || '#000000',
    fontFamily: activeSheet.cellFontFamily || 'Arial',
    fontSize: `${activeSheet.cellFontSize || 11}pt`,
    fontWeight: activeSheet.cellBold ? 700 : 400,
  }
  const dateStyle = {
    ...headerStyle,
    color: activeSheet.dateFontColor || '#000000',
    fontFamily: activeSheet.dateFontFamily || 'Arial',
    fontSize: `${activeSheet.dateFontSize || 12}pt`,
    fontWeight: activeSheet.dateBold === false ? 400 : 700,
  }
  const columnHeaderStyle = (column: SpreadsheetColumn) => ({
    ...headerStyle,
    fontSize: `${column.headerFontSize || activeSheet.headerFontSize || 12}pt`,
  })

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
          pageSetup: {
            paperSize: 9,
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            horizontalCentered: true,
            printTitlesRow: `1:${headerRows}`,
            margins: {
              left: 0.1,
              right: 0.1,
              top: 0.15,
              bottom: 0.15,
              header: 0.05,
              footer: 0.05,
            },
          },
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
            cell.font = {
              name: sheet.headerFontFamily || 'Arial',
              size: sheet.headerFontSize || 12,
              bold: sheet.headerBold ?? true,
              color: { argb: `FF${(sheet.headerFontColor || '#000000').slice(1).toUpperCase()}` },
            }
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: `FF${(sheet.headerBackgroundColor || '#FFFFFF').slice(1).toUpperCase()}` },
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
          })
        }
        sheet.columns.forEach((column, columnIndex) => {
          for (let rowNumber = 1; rowNumber <= headerRows; rowNumber++) {
            const cell = worksheet.getCell(rowNumber, columnIndex + 1)
            cell.font = {
              ...cell.font,
              size: column.headerFontSize || sheet.headerFontSize || 12,
            }
          }
        })
        if (hierarchical) {
          sheet.columns.forEach((column, columnIndex) => {
            if (!column.dateValue) return
            worksheet.getCell(2, columnIndex + 1).font = {
              name: sheet.dateFontFamily || 'Arial',
              size: sheet.dateFontSize || 12,
              bold: sheet.dateBold ?? true,
              color: { argb: `FF${(sheet.dateFontColor || '#000000').slice(1).toUpperCase()}` },
            }
          })
        }
        for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
          for (let columnNumber = 1; columnNumber <= sheet.columns.length; columnNumber++) {
            worksheet.getCell(rowNumber, columnNumber).border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } },
            }
          }
        }
        for (let rowNumber = headerRows + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
          worksheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell) => {
            cell.font = {
              name: sheet.cellFontFamily || 'Arial',
              size: sheet.cellFontSize || 11,
              bold: sheet.cellBold ?? false,
              color: { argb: `FF${(sheet.cellFontColor || '#000000').slice(1).toUpperCase()}` },
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
          })
        }
        if (!hierarchical) {
          worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: sheet.columns.length },
          }
        }
        if (sheet.columns.length > 0 && worksheet.rowCount > 0) {
          worksheet.pageSetup.printArea = `A1:${worksheet.getColumn(sheet.columns.length).letter}${worksheet.rowCount}`
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
            {helpText
              ? <p className="text-xs text-deep-500 mt-1">{helpText}</p>
              : <p className="text-xs text-deep-500 mt-1">الأعمدة والعناوين محفوظة في <a href="/settings" className="font-semibold text-cyan-700 underline dark:text-cyan-300">إعدادات قوالب Excel</a>.</p>}
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
                {activeSheet.columns.map((column, index) => {
                  if (!hierarchical) {
                    return (
                      <th key={column.id} className="border border-slate-500 p-2" style={{ ...columnHeaderStyle(column), minWidth: `${(column.width ?? 18) * 8}px` }}>
                        {column.label}
                      </th>
                    )
                  }
                  if (!column.groupId) {
                    return (
                      <th key={column.id} rowSpan={2} className="border border-slate-500 p-2" style={{ ...columnHeaderStyle(column), minWidth: `${(column.width ?? 18) * 8}px` }}>
                        {column.label}
                      </th>
                    )
                  }
                  if (index > 0 && activeSheet.columns[index - 1].groupId === column.groupId) return null
                  let span = 1
                  while (index + span < activeSheet.columns.length && activeSheet.columns[index + span].groupId === column.groupId) span += 1
                  return <th key={column.groupId} colSpan={span} className="border border-slate-500 p-2" style={columnHeaderStyle(column)}>{column.groupLabel}</th>
                })}
              </tr>
              {hierarchical && (
                <tr>
                  {activeSheet.columns.filter((column) => column.groupId).map((column) => (
                    <th key={column.id} className="border border-slate-500 p-2" style={{ ...(column.dateValue ? dateStyle : columnHeaderStyle(column)), minWidth: `${(column.width ?? 18) * 8}px` }}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {activeSheet.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {activeSheet.columns.map((column) => (
                    <td
                      key={column.id}
                      className="border border-slate-500 px-3 py-2 text-center align-middle text-deep-700"
                      style={{ ...cellStyle, minWidth: `${(column.width ?? 18) * 8}px` }}
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

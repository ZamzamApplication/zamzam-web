import type { SpreadsheetSheet } from '@/components/ExcelPreviewModal'

export type ExcelTemplateKey = 'attendance' | 'statistics' | 'progress'

export interface ExcelTemplateColumn {
  id: string
  label: string
  enabled: boolean
  custom: boolean
  width: number
}

export interface ExcelExportTemplate {
  columns: ExcelTemplateColumn[]
}

export type ExcelExportTemplates = Record<ExcelTemplateKey, ExcelExportTemplate>

export const DEFAULT_EXCEL_EXPORT_TEMPLATES: ExcelExportTemplates = {
  attendance: {
    columns: [
      { id: 'student', label: 'الطالب', enabled: true, custom: false, width: 24 },
      { id: 'sheikh', label: 'الشيخ', enabled: true, custom: false, width: 20 },
      { id: 'attendance', label: 'الحضور', enabled: true, custom: false, width: 18 },
    ],
  },
  statistics: {
    columns: [
      { id: 'student', label: 'الطالب', enabled: true, custom: false, width: 24 },
      { id: 'sheikh', label: 'الشيخ', enabled: true, custom: false, width: 20 },
      { id: 'sessions', label: 'إجمالي الحلقات', enabled: true, custom: false, width: 16 },
      { id: 'present', label: 'حاضر', enabled: true, custom: false, width: 14 },
      { id: 'excused', label: 'غياب بعذر', enabled: true, custom: false, width: 16 },
      { id: 'absent', label: 'غائب', enabled: true, custom: false, width: 14 },
      { id: 'notApplicable', label: 'لا ينطبق', enabled: true, custom: false, width: 16 },
      { id: 'rate', label: 'نسبة الحضور', enabled: true, custom: false, width: 16 },
    ],
  },
  progress: {
    columns: [
      { id: 'student', label: 'الطالب', enabled: true, custom: false, width: 24 },
      { id: 'entries', label: 'عدد سجلات المتابعة', enabled: true, custom: false, width: 20 },
      { id: 'quality', label: 'متوسط التقييم', enabled: true, custom: false, width: 18 },
      { id: 'mistakes', label: 'إجمالي الأخطاء', enabled: true, custom: false, width: 18 },
      { id: 'latestRange', label: 'آخر مقدار', enabled: true, custom: false, width: 28 },
    ],
  },
}

export function configuredExcelExportTemplates(value?: Partial<ExcelExportTemplates> | null): ExcelExportTemplates {
  return Object.fromEntries(
    (Object.keys(DEFAULT_EXCEL_EXPORT_TEMPLATES) as ExcelTemplateKey[]).map((key) => {
      const configured = value?.[key]?.columns
      return [
        key,
        {
          columns: Array.isArray(configured) && configured.length > 0
            ? configured.map((column) => ({ ...column }))
            : DEFAULT_EXCEL_EXPORT_TEMPLATES[key].columns.map((column) => ({ ...column })),
        },
      ]
    })
  ) as ExcelExportTemplates
}

export function applyExcelTemplate(
  source: SpreadsheetSheet,
  template: ExcelExportTemplate,
): SpreadsheetSheet {
  const sourceColumns = new Map(source.columns.map((column) => [column.id, column]))
  const columns = template.columns
    .filter((column) => column.enabled)
    .flatMap((column) => {
      if (column.id === 'attendance') {
        return source.columns
          .filter((sourceColumn) => sourceColumn.id.startsWith('session_'))
          .map((sourceColumn) => ({ ...sourceColumn, width: column.width }))
      }
      const sourceColumn = sourceColumns.get(column.id)
      return [{
        id: column.id,
        label: column.label || sourceColumn?.label || 'عمود',
        width: column.width,
      }]
    })
  return {
    ...source,
    columns,
    rows: source.rows.map((row) => Object.fromEntries(
      columns.map((column) => [column.id, row[column.id] ?? ''])
    )),
  }
}

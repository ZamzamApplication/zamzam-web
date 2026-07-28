import type { SpreadsheetSheet } from '@/components/ExcelPreviewModal'

export type ExcelTemplateKey = 'attendance' | 'statistics' | 'progress'

export interface ExcelTemplateColumn {
  id: string
  label: string
  enabled: boolean
  custom: boolean
  width: number
  show_header: boolean
  subcolumns: ExcelTemplateSubcolumn[]
}

export interface ExcelTemplateSubcolumn {
  id: string
  label: string
  width: number
}

export interface ExcelExportTemplate {
  columns: ExcelTemplateColumn[]
}

export type ExcelExportTemplates = Record<ExcelTemplateKey, ExcelExportTemplate>

function standardColumn(id: string, label: string, width: number): ExcelTemplateColumn {
  return { id, label, enabled: true, custom: false, width, show_header: true, subcolumns: [] }
}

export const DEFAULT_EXCEL_EXPORT_TEMPLATES: ExcelExportTemplates = {
  attendance: {
    columns: [
      standardColumn('student', 'الطالب', 24),
      standardColumn('sheikh', 'الشيخ', 20),
      standardColumn('attendance', 'الحضور', 18),
    ],
  },
  statistics: {
    columns: [
      standardColumn('student', 'الطالب', 24),
      standardColumn('sheikh', 'الشيخ', 20),
      standardColumn('sessions', 'إجمالي الحلقات', 16),
      standardColumn('present', 'حاضر', 14),
      standardColumn('excused', 'غياب بعذر', 16),
      standardColumn('absent', 'غائب', 14),
      standardColumn('notApplicable', 'لا ينطبق', 16),
      standardColumn('rate', 'نسبة الحضور', 16),
    ],
  },
  progress: {
    columns: [
      standardColumn('student', 'الطالب', 24),
      standardColumn('entries', 'عدد سجلات المتابعة', 20),
      standardColumn('quality', 'متوسط التقييم', 18),
      standardColumn('mistakes', 'إجمالي الأخطاء', 18),
      standardColumn('latestRange', 'آخر مقدار', 28),
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
            ? configured.map((column) => ({
                ...column,
                width: column.width ?? 18,
                show_header: column.show_header ?? true,
                subcolumns: Array.isArray(column.subcolumns)
                  ? column.subcolumns.map((subcolumn) => ({ ...subcolumn, width: subcolumn.width ?? 18 }))
                  : [],
              }))
            : DEFAULT_EXCEL_EXPORT_TEMPLATES[key].columns.map((column) => ({
                ...column,
                show_header: true,
                subcolumns: [],
              })),
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
          .map((sourceColumn) => ({
            ...sourceColumn,
            label: column.show_header ? sourceColumn.label : '',
            width: column.width,
            groupId: column.id,
            groupLabel: column.label,
          }))
      }
      if (column.subcolumns.length >= 2) {
        return column.subcolumns.map((subcolumn) => ({
          id: `${column.id}__${subcolumn.id}`,
          label: subcolumn.label,
          width: subcolumn.width,
          groupId: column.id,
          groupLabel: column.label,
        }))
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

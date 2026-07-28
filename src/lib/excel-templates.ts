import type { SpreadsheetSheet } from '@/components/ExcelPreviewModal'
import { getArabicDay } from '@/lib/format'

export type ExcelTemplateKey = 'attendance' | 'statistics' | 'progress'
export type AttendanceDateFormat =
  | 'day'
  | 'day_month'
  | 'day_month_year'
  | 'weekday'
  | 'weekday_day'
  | 'weekday_day_month'
  | 'weekday_day_month_year'

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
  header_font_family: string
  header_font_size: number
  header_bold: boolean
  header_background_color: string
  header_font_color: string
  cell_font_family: string
  cell_font_size: number
  cell_bold: boolean
  cell_font_color: string
  date_font_family: string
  date_font_size: number
  date_bold: boolean
  date_font_color: string
  attendance_date_format: AttendanceDateFormat
}

export type ExcelExportTemplates = Record<ExcelTemplateKey, ExcelExportTemplate>

function standardColumn(id: string, label: string, width: number, enabled = true): ExcelTemplateColumn {
  return { id, label, enabled, custom: false, width, show_header: true, subcolumns: [] }
}

const DEFAULT_TEMPLATE_STYLE = {
  header_font_family: 'Arial',
  header_font_size: 12,
  header_bold: true,
  header_background_color: '#FFFFFF',
  header_font_color: '#000000',
  cell_font_family: 'Arial',
  cell_font_size: 11,
  cell_bold: false,
  cell_font_color: '#000000',
  date_font_family: 'Arial',
  date_font_size: 12,
  date_bold: true,
  date_font_color: '#000000',
  attendance_date_format: 'weekday_day_month_year' as AttendanceDateFormat,
}

export const DEFAULT_EXCEL_EXPORT_TEMPLATES: ExcelExportTemplates = {
  attendance: {
    ...DEFAULT_TEMPLATE_STYLE,
    columns: [
      standardColumn('serial', 'م', 6, false),
      standardColumn('student', 'الطالب', 24),
      standardColumn('sheikh', 'الشيخ', 20),
      standardColumn('attendance', 'الحضور', 18),
    ],
  },
  statistics: {
    ...DEFAULT_TEMPLATE_STYLE,
    columns: [
      standardColumn('serial', 'م', 6, false),
      standardColumn('student', 'الطالب', 24),
      standardColumn('sheikh', 'الشيخ', 20),
      standardColumn('sessions', 'إجمالي الحلقات', 16),
      standardColumn('statuses', 'حالات الحضور', 14),
      standardColumn('rate', 'نسبة الحضور', 16),
    ],
  },
  progress: {
    ...DEFAULT_TEMPLATE_STYLE,
    columns: [
      standardColumn('serial', 'م', 6, false),
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
      const storedColumns = value?.[key]?.columns
      const legacyStatisticsIds = new Set(['present', 'excused', 'absent', 'notApplicable'])
      const configured = key === 'statistics'
        && Array.isArray(storedColumns)
        ? storedColumns.filter((column) => !legacyStatisticsIds.has(column.id))
        : storedColumns
      const configuredIds = new Set(
        Array.isArray(configured) ? configured.map((column) => column.id) : []
      )
      const missingColumns = DEFAULT_EXCEL_EXPORT_TEMPLATES[key].columns
        .filter((column) => !configuredIds.has(column.id))
        .map((column) => ({ ...column, subcolumns: [] }))
      return [
        key,
        {
          header_font_family: value?.[key]?.header_font_family?.trim() || DEFAULT_TEMPLATE_STYLE.header_font_family,
          header_font_size: value?.[key]?.header_font_size ?? DEFAULT_TEMPLATE_STYLE.header_font_size,
          header_bold: value?.[key]?.header_bold ?? DEFAULT_TEMPLATE_STYLE.header_bold,
          header_background_color: value?.[key]?.header_background_color || DEFAULT_TEMPLATE_STYLE.header_background_color,
          header_font_color: value?.[key]?.header_font_color || DEFAULT_TEMPLATE_STYLE.header_font_color,
          cell_font_family: value?.[key]?.cell_font_family?.trim() || DEFAULT_TEMPLATE_STYLE.cell_font_family,
          cell_font_size: value?.[key]?.cell_font_size ?? DEFAULT_TEMPLATE_STYLE.cell_font_size,
          cell_bold: value?.[key]?.cell_bold ?? DEFAULT_TEMPLATE_STYLE.cell_bold,
          cell_font_color: value?.[key]?.cell_font_color || DEFAULT_TEMPLATE_STYLE.cell_font_color,
          date_font_family: value?.[key]?.date_font_family?.trim() || DEFAULT_TEMPLATE_STYLE.date_font_family,
          date_font_size: value?.[key]?.date_font_size ?? DEFAULT_TEMPLATE_STYLE.date_font_size,
          date_bold: value?.[key]?.date_bold ?? DEFAULT_TEMPLATE_STYLE.date_bold,
          date_font_color: value?.[key]?.date_font_color || DEFAULT_TEMPLATE_STYLE.date_font_color,
          attendance_date_format: value?.[key]?.attendance_date_format || DEFAULT_TEMPLATE_STYLE.attendance_date_format,
          columns: Array.isArray(configured) && configured.length > 0
            ? [
                ...missingColumns,
                ...configured.map((column) => ({
                  ...column,
                  width: column.width ?? 18,
                  show_header: column.show_header ?? true,
                  subcolumns: Array.isArray(column.subcolumns)
                    ? column.subcolumns.map((subcolumn) => ({ ...subcolumn, width: subcolumn.width ?? 18 }))
                    : [],
                })),
              ]
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

function formatAttendanceDate(dateValue: string | undefined, format: AttendanceDateFormat): string {
  if (!dateValue) return ''
  const [year, month, day] = dateValue.split('-')
  const weekday = getArabicDay(dateValue)
  if (format === 'day') return day
  if (format === 'day_month') return `${day}/${month}`
  if (format === 'day_month_year') return `${day}/${month}/${year}`
  if (format === 'weekday') return weekday
  if (format === 'weekday_day') return `${weekday} ${day}`
  if (format === 'weekday_day_month') return `${weekday} ${day}/${month}`
  return `${weekday} ${day}/${month}/${year}`
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
            label: column.show_header
              ? formatAttendanceDate(sourceColumn.dateValue, template.attendance_date_format)
              : '',
            width: column.width,
            groupId: column.id,
            groupLabel: column.label,
          }))
      }
      if (column.id === 'statuses') {
        return source.columns
          .filter((sourceColumn) => sourceColumn.id.startsWith('status_'))
          .map((sourceColumn) => ({
            ...sourceColumn,
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
    headerFontFamily: template.header_font_family,
    headerFontSize: template.header_font_size,
    headerBold: template.header_bold,
    headerBackgroundColor: template.header_background_color,
    headerFontColor: template.header_font_color,
    cellFontFamily: template.cell_font_family,
    cellFontSize: template.cell_font_size,
    cellBold: template.cell_bold,
    cellFontColor: template.cell_font_color,
    dateFontFamily: template.date_font_family,
    dateFontSize: template.date_font_size,
    dateBold: template.date_bold,
    dateFontColor: template.date_font_color,
    columns,
    rows: source.rows.map((row, rowIndex) => Object.fromEntries(
      columns.map((column) => [column.id, column.id === 'serial' ? rowIndex + 1 : row[column.id] ?? ''])
    )),
  }
}

import { describe, expect, it } from 'vitest'
import { applyExcelTemplate, DEFAULT_EXCEL_EXPORT_TEMPLATES } from './excel-templates'

describe('student custom fields in Excel', () => {
  it('prints a field-backed custom column by its stable field id', () => {
    const template = {
      ...DEFAULT_EXCEL_EXPORT_TEMPLATES.attendance,
      columns: [{
        id: 'custom_field_12', label: 'المستوى', enabled: true, custom: true,
        width: 18, header_font_size: 12, show_header: true, subcolumns: [],
      }],
    }
    const sheet = applyExcelTemplate({
      name: 'سجل الحضور',
      columns: [{ id: 'student', label: 'الطالب' }],
      rows: [{ student: 'أحمد', custom_field_12: 'المستوى الأول' }],
    }, template)

    expect(sheet.columns[0].id).toBe('custom_field_12')
    expect(sheet.rows[0].custom_field_12).toBe('المستوى الأول')
  })
})

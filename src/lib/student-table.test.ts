import { describe, expect, it } from 'vitest'
import {
  applyTableView, buildStudentColumns, defaultTableView, groupStudents, isColumnVisible, toCsv,
  type FilterRule, type TableViewState,
} from './student-table'
import type { StudentCustomField, StudentInfo } from './types'

const student = (overrides: Partial<StudentInfo> & { id: number; name: string }): StudentInfo => ({
  status: 'مقيد',
  warnings: [],
  ...overrides,
})

const students: StudentInfo[] = [
  student({ id: 1, name: 'يوسف', sheikh: { id: 1, name: 'الشيخ أحمد' }, registration_date: '2025-03-01', warnings: [{ id: 1 } as any, { id: 2 } as any], categories: [{ id: 1, name: 'مبتدئ' }], custom_field_values: { '9': 'المدرسة أ', '10': 'true' } }),
  student({ id: 2, name: 'أحمد', sheikh: { id: 2, name: 'الشيخ محمد' }, status: 'ضيف', registration_date: '2024-01-10', phone: '0100' }),
  student({ id: 3, name: 'محمود', sheikh: { id: 1, name: 'الشيخ أحمد' }, warnings: [{ id: 3 } as any], categories: [{ id: 2, name: 'متقدم' }] }),
]

const customFields: StudentCustomField[] = [
  { id: 9, name: 'المدرسة', field_type: 'text', options: [], is_required: false, is_active: true, sort_order: 0, can_edit: true },
  { id: 10, name: 'منحة', field_type: 'checkbox', options: [], is_required: false, is_active: true, sort_order: 1, can_edit: true },
  { id: 11, name: 'قديم', field_type: 'text', options: [], is_required: false, is_active: false, sort_order: 2, can_edit: true },
]

const columns = buildStudentColumns(students, customFields)
const view = (patch: Partial<TableViewState>): TableViewState => ({ ...defaultTableView(), ...patch })
const rule = (patch: Partial<FilterRule> & Pick<FilterRule, 'column' | 'operator'>): FilterRule => ({ id: 'r', value: '', ...patch })
const ids = (list: StudentInfo[]) => list.map(s => s.id)

describe('student table view', () => {
  it('builds columns including active custom fields only', () => {
    const keys = columns.map(c => c.key)
    expect(keys).toContain('custom:9')
    expect(keys).toContain('custom:10')
    expect(keys).not.toContain('custom:11')
    expect(columns.find(c => c.key === 'sheikh')?.options).toEqual(['الشيخ أحمد', 'الشيخ محمد'])
  })

  it('searches across text columns', () => {
    expect(ids(applyTableView(students, columns, view({ search: 'محمد' })))).toEqual([2])
    expect(ids(applyTableView(students, columns, view({ search: 'المدرسة' })))).toEqual([1])
  })

  it('filters select columns with any_of / none_of', () => {
    expect(ids(applyTableView(students, columns, view({ filters: [rule({ column: 'status', operator: 'any_of', values: ['ضيف'] })] })))).toEqual([2])
    expect(ids(applyTableView(students, columns, view({ filters: [rule({ column: 'sheikh', operator: 'none_of', values: ['الشيخ أحمد'] })] })))).toEqual([2])
    expect(ids(applyTableView(students, columns, view({ filters: [rule({ column: 'categories', operator: 'is_empty' })] })))).toEqual([2])
  })

  it('ignores incomplete filters', () => {
    expect(ids(applyTableView(students, columns, view({ filters: [rule({ column: 'status', operator: 'any_of', values: [] }), rule({ column: 'name', operator: 'contains' })] })))).toEqual([1, 2, 3])
  })

  it('filters numbers, dates, and checkboxes', () => {
    expect(ids(applyTableView(students, columns, view({ filters: [rule({ column: 'warnings', operator: 'gt', value: '0' })] })))).toEqual([1, 3])
    expect(ids(applyTableView(students, columns, view({ filters: [rule({ column: 'registration_date', operator: 'after', value: '2024-12-31' })] })))).toEqual([1])
    expect(ids(applyTableView(students, columns, view({ filters: [rule({ column: 'custom:10', operator: 'checked' })] })))).toEqual([1])
  })

  it('combines filters with AND', () => {
    expect(ids(applyTableView(students, columns, view({ filters: [
      rule({ column: 'sheikh', operator: 'any_of', values: ['الشيخ أحمد'] }),
      rule({ column: 'warnings', operator: 'lt', value: '2' }),
    ] })))).toEqual([3])
  })

  it('sorts with multiple rules and keeps empty values last', () => {
    expect(ids(applyTableView(students, columns, view({ sorts: [{ column: 'name', direction: 'asc' }] })))).toEqual([2, 3, 1])
    expect(ids(applyTableView(students, columns, view({ sorts: [{ column: 'registration_date', direction: 'desc' }] })))).toEqual([1, 2, 3])
    expect(ids(applyTableView(students, columns, view({ sorts: [{ column: 'registration_date', direction: 'asc' }] })))).toEqual([2, 1, 3])
    expect(ids(applyTableView(students, columns, view({ sorts: [{ column: 'sheikh', direction: 'asc' }, { column: 'warnings', direction: 'desc' }] })))).toEqual([1, 3, 2])
  })

  it('groups by a column, putting multi values in each group', () => {
    const groups = groupStudents(students, columns.find(c => c.key === 'categories'))
    expect(groups.map(g => [g.key, ids(g.students)])).toEqual([['مبتدئ', [1]], ['متقدم', [3]], ['—', [2]]])
    const byStatus = groupStudents(students, columns.find(c => c.key === 'status'))
    expect(byStatus.map(g => g.key)).toEqual(['مقيد', 'ضيف'])
  })

  it('toggles default-hidden columns', () => {
    const birthday = columns.find(c => c.key === 'birthday')!
    const name = columns.find(c => c.key === 'name')!
    expect(isColumnVisible(birthday, [])).toBe(false)
    expect(isColumnVisible(birthday, ['birthday'])).toBe(true)
    expect(isColumnVisible(name, ['name'])).toBe(false)
  })

  it('exports CSV with escaping', () => {
    const csv = toCsv([student({ id: 5, name: 'a, "b"' })], columns.filter(c => c.key === 'name' || c.key === 'warnings'))
    expect(csv).toBe('الاسم,الإنذارات\n"a, ""b""",0')
  })
})

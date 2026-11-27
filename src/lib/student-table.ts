import type { StudentCustomField, StudentInfo } from './types'

export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'multi' | 'checkbox'

export interface TableColumn {
  key: string
  label: string
  type: ColumnType
  /** Options for select/multi columns, used by the filter value picker. */
  options?: string[]
  /** Hidden in a fresh view; the viewer can show it from the columns menu. */
  hiddenByDefault?: boolean
  /** Raw comparable value(s) for filtering and sorting. */
  value(student: StudentInfo): string | number | boolean | string[] | null
}

export type FilterOperator =
  | 'contains' | 'not_contains' | 'is' | 'is_not' | 'is_empty' | 'is_not_empty'
  | 'eq' | 'gt' | 'lt' | 'before' | 'after'
  | 'any_of' | 'none_of' | 'checked' | 'unchecked'

export interface FilterRule {
  id: string
  column: string
  operator: FilterOperator
  value: string
  /** Selected options for any_of / none_of. */
  values?: string[]
}

export interface SortRule {
  column: string
  direction: 'asc' | 'desc'
}

export interface TableViewState {
  search: string
  filters: FilterRule[]
  sorts: SortRule[]
  toggledColumns: string[]
  groupBy: string
}

export const STUDENT_STATUSES = ['مقيد', 'مستبعد', 'منقطع', 'ضيف', 'غير مقيد']

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: 'يحتوي',
  not_contains: 'لا يحتوي',
  is: 'يساوي',
  is_not: 'لا يساوي',
  is_empty: 'فارغ',
  is_not_empty: 'غير فارغ',
  eq: '=',
  gt: 'أكبر من',
  lt: 'أصغر من',
  before: 'قبل',
  after: 'بعد',
  any_of: 'أحد',
  none_of: 'ليس أحد',
  checked: 'نعم',
  unchecked: 'لا',
}

export function operatorsFor(type: ColumnType): FilterOperator[] {
  switch (type) {
    case 'text': return ['contains', 'not_contains', 'is', 'is_not', 'is_empty', 'is_not_empty']
    case 'number': return ['eq', 'gt', 'lt', 'is_empty', 'is_not_empty']
    case 'date': return ['is', 'before', 'after', 'is_empty', 'is_not_empty']
    case 'select':
    case 'multi': return ['any_of', 'none_of', 'is_empty', 'is_not_empty']
    case 'checkbox': return ['checked', 'unchecked']
  }
}

export function operatorNeedsValue(operator: FilterOperator): boolean {
  return !['is_empty', 'is_not_empty', 'checked', 'unchecked'].includes(operator)
}

function ageFromBirthday(birthday?: string): number | null {
  if (!birthday) return null
  const born = new Date(birthday)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const beforeBirthday = now.getMonth() < born.getMonth()
    || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function uniqueSorted(values: (string | undefined | null)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
    .sort((a, b) => a.localeCompare(b, 'ar'))
}

function customColumnType(field: StudentCustomField): ColumnType {
  if (field.field_type === 'number') return 'number'
  if (field.field_type === 'date') return 'date'
  if (field.field_type === 'checkbox') return 'checkbox'
  if (field.field_type === 'select') return 'select'
  return 'text'
}

function isTruthyFlag(value: string | undefined): boolean {
  return value === 'true' || value === '1' || value === 'نعم'
}

export function buildStudentColumns(students: StudentInfo[], customFields: StudentCustomField[]): TableColumn[] {
  const columns: TableColumn[] = [
    { key: 'name', label: 'الاسم', type: 'text', value: s => s.name },
    { key: 'student_id', label: 'الرقم', type: 'text', value: s => s.student_id || null },
    {
      key: 'sheikh', label: 'الشيخ', type: 'select',
      options: uniqueSorted(students.map(s => s.sheikh?.name)),
      value: s => s.sheikh?.name || null,
    },
    {
      key: 'status', label: 'الحالة', type: 'select',
      options: [...STUDENT_STATUSES, ...uniqueSorted(students.map(s => s.status)).filter(status => !STUDENT_STATUSES.includes(status))],
      value: s => s.status || null,
    },
    { key: 'phone', label: 'الهاتف', type: 'text', value: s => s.phone || null },
    {
      key: 'parent_phones', label: 'هاتف ولي الأمر', type: 'text',
      value: s => (s.parent_phones || []).map(p => p.phone_number).filter(Boolean).join(' ، ') || null,
    },
    { key: 'age', label: 'العمر', type: 'number', value: s => ageFromBirthday(s.birthday) },
    { key: 'birthday', label: 'تاريخ الميلاد', type: 'date', hiddenByDefault: true, value: s => s.birthday || null },
    { key: 'registration_date', label: 'تاريخ التسجيل', type: 'date', value: s => s.registration_date || null },
    { key: 'warnings', label: 'الإنذارات', type: 'number', value: s => s.warnings?.length ?? 0 },
    {
      key: 'categories', label: 'التصنيفات', type: 'multi',
      options: uniqueSorted(students.flatMap(s => (s.categories || []).map(c => c.name))),
      value: s => (s.categories || []).map(c => c.name),
    },
    {
      key: 'quran_progress_enabled', label: 'متابعة الحفظ', type: 'checkbox', hiddenByDefault: true,
      value: s => Boolean(s.quran_progress_enabled),
    },
  ]

  for (const field of customFields.filter(f => f.is_active)) {
    const type = customColumnType(field)
    const id = String(field.id)
    columns.push({
      key: `custom:${id}`,
      label: field.name,
      type,
      hiddenByDefault: true,
      options: type === 'select' ? field.options : undefined,
      value: (s) => {
        const raw = s.custom_field_values?.[id]
        if (type === 'checkbox') return isTruthyFlag(raw)
        if (raw === undefined || raw === null || raw === '') return null
        if (type === 'number') {
          const parsed = Number(raw)
          return Number.isFinite(parsed) ? parsed : null
        }
        return raw
      },
    })
  }

  return columns
}

function isEmpty(value: ReturnType<TableColumn['value']>): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase('ar')
}

export function matchesFilter(student: StudentInfo, column: TableColumn, rule: FilterRule): boolean {
  const value = column.value(student)
  const { operator } = rule

  if (operator === 'is_empty') return isEmpty(value)
  if (operator === 'is_not_empty') return !isEmpty(value)
  if (operator === 'checked') return value === true
  if (operator === 'unchecked') return value !== true

  if (operator === 'any_of' || operator === 'none_of') {
    const selected = rule.values || []
    // An incomplete rule (nothing selected yet) never hides rows.
    if (selected.length === 0) return true
    const current = Array.isArray(value) ? value : isEmpty(value) ? [] : [String(value)]
    const hit = current.some(item => selected.includes(item))
    return operator === 'any_of' ? hit : !hit
  }

  if (rule.value.trim() === '') return true

  if (column.type === 'number') {
    const target = Number(rule.value)
    if (!Number.isFinite(target)) return true
    if (typeof value !== 'number') return false
    if (operator === 'eq') return value === target
    if (operator === 'gt') return value > target
    if (operator === 'lt') return value < target
    return true
  }

  if (column.type === 'date') {
    if (typeof value !== 'string' || !value) return false
    const day = value.slice(0, 10)
    if (operator === 'is') return day === rule.value
    if (operator === 'before') return day < rule.value
    if (operator === 'after') return day > rule.value
    return true
  }

  const text = normalize(Array.isArray(value) ? value.join(' ') : value === null ? '' : String(value))
  const needle = normalize(rule.value)
  if (operator === 'contains') return text.includes(needle)
  if (operator === 'not_contains') return !text.includes(needle)
  if (operator === 'is') return text === needle
  if (operator === 'is_not') return text !== needle
  return true
}

function compareValues(a: ReturnType<TableColumn['value']>, b: ReturnType<TableColumn['value']>): number {
  const aEmpty = isEmpty(a)
  const bEmpty = isEmpty(b)
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(b) - Number(a)
  const left = Array.isArray(a) ? a.join('، ') : String(a)
  const right = Array.isArray(b) ? b.join('، ') : String(b)
  return left.localeCompare(right, 'ar', { numeric: true, sensitivity: 'base' })
}

export function applyTableView(students: StudentInfo[], columns: TableColumn[], view: TableViewState): StudentInfo[] {
  const byKey = new Map(columns.map(column => [column.key, column]))
  const search = normalize(view.search)

  const filtered = students.filter((student) => {
    if (search) {
      const haystack = columns
        .map(column => column.value(student))
        .filter(value => typeof value === 'string' || Array.isArray(value))
        .map(value => (Array.isArray(value) ? value.join(' ') : String(value)))
        .join(' ')
      if (!normalize(haystack).includes(search)) return false
    }
    return view.filters.every((rule) => {
      const column = byKey.get(rule.column)
      return column ? matchesFilter(student, column, rule) : true
    })
  })

  const sorts = view.sorts.filter(sort => byKey.has(sort.column))
  if (sorts.length === 0) return filtered

  return filtered
    .map((student, index) => ({ student, index }))
    .sort((left, right) => {
      for (const sort of sorts) {
        const column = byKey.get(sort.column)!
        const a = column.value(left.student)
        const b = column.value(right.student)
        // Empty values stay at the bottom regardless of direction.
        if (isEmpty(a) !== isEmpty(b)) return isEmpty(a) ? 1 : -1
        const diff = compareValues(a, b)
        if (diff !== 0) return sort.direction === 'asc' ? diff : -diff
      }
      return left.index - right.index
    })
    .map(item => item.student)
}

export function groupStudents(students: StudentInfo[], column: TableColumn | undefined): { key: string; students: StudentInfo[] }[] {
  if (!column) return [{ key: '', students }]
  const groups = new Map<string, StudentInfo[]>()
  for (const student of students) {
    const value = column.value(student)
    const keys = Array.isArray(value)
      ? (value.length ? value : ['—'])
      : [isEmpty(value) ? '—' : typeof value === 'boolean' ? (value ? 'نعم' : 'لا') : String(value)]
    for (const key of keys) {
      const current = groups.get(key) || []
      current.push(student)
      groups.set(key, current)
    }
  }
  const order = column.options || []
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === '—') return 1
      if (b === '—') return -1
      const ai = order.indexOf(a)
      const bi = order.indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      return a.localeCompare(b, 'ar', { numeric: true })
    })
    .map(([key, list]) => ({ key, students: list }))
}

export function defaultTableView(): TableViewState {
  return { search: '', filters: [], sorts: [], toggledColumns: [], groupBy: '' }
}

/** toggledColumns lists columns whose default visibility the viewer flipped. */
export function isColumnVisible(column: TableColumn, toggledColumns: string[]): boolean {
  const toggled = toggledColumns.includes(column.key)
  return column.hiddenByDefault ? toggled : !toggled
}

export function formatCell(column: TableColumn, student: StudentInfo): string {
  const value = column.value(student)
  if (column.type === 'checkbox') return value ? '✓' : ''
  if (isEmpty(value)) return ''
  if (Array.isArray(value)) return value.join('، ')
  return String(value)
}

export function toCsv(students: StudentInfo[], columns: TableColumn[]): string {
  const escape = (text: string) => (/[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text)
  const header = columns.map(column => escape(column.label)).join(',')
  const rows = students.map(student => columns.map(column => escape(formatCell(column, student))).join(','))
  return [header, ...rows].join('\n')
}

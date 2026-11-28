'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/format'
import ScrollableTable from '@/components/ScrollableTable'
import Icon from '@/components/Icon'
import {
  OPERATOR_LABELS, applyTableView, buildStudentColumns, defaultTableView, formatCell, groupStudents,
  isColumnVisible, operatorNeedsValue, operatorsFor, toCsv,
  type FilterRule, type SortRule, type TableColumn, type TableViewState,
} from '@/lib/student-table'
import type { StudentCustomField, StudentInfo } from '@/lib/types'

const STORAGE_KEY = 'manage-students-table-view'
const PHONE_QUERY = '(max-width: 767px)'

/** Phones get a card list instead of the wide table. */
function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches)
  useEffect(() => {
    const media = window.matchMedia(PHONE_QUERY)
    const onChange = () => setPhone(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return phone
}

function hasCellValue(column: TableColumn, student: StudentInfo) {
  if (column.key === 'warnings') return (student.warnings?.length || 0) > 0
  return formatCell(column, student) !== ''
}

const STATUS_STYLES: Record<string, string> = {
  'مقيد': 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'ضيف': 'bg-sky-100/70 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  'منقطع': 'bg-amber-100/70 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'مستبعد': 'bg-red-100/70 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  'غير مقيد': 'bg-slate-100/70 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
}

function loadView(): TableViewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultTableView()
    return { ...defaultTableView(), ...JSON.parse(raw) }
  } catch {
    return defaultTableView()
  }
}

function saveView(view: TableViewState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(view)) } catch { /* storage unavailable */ }
}

let ruleCounter = 0
const newRuleId = () => `f${Date.now().toString(36)}${(ruleCounter++).toString(36)}`

function defaultOperator(column: TableColumn): FilterRule['operator'] {
  return operatorsFor(column.type)[0]
}

function OptionPicker({ column, selected, onChange }: { column: TableColumn; selected: string[]; onChange(values: string[]): void }) {
  const options = column.options || []
  const summary = selected.length === 0 ? 'اختر...' : selected.length <= 2 ? selected.join('، ') : `${selected.length} مختارة`
  return (
    <details className="relative">
      <summary className="surface-field cursor-pointer list-none rounded-xl px-2 py-1 text-xs min-w-[96px] max-w-[180px] truncate">{summary}</summary>
      <div className="glass-card absolute right-0 z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl p-2 shadow-lg">
        {options.length === 0 && <p className="px-2 py-1 text-xs text-deep-500">لا توجد خيارات</p>}
        {options.map(option => (
          <label key={option} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-deep-800 hover:bg-water-100/40">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={event => onChange(event.target.checked ? [...selected, option] : selected.filter(item => item !== option))}
            />
            {option}
          </label>
        ))}
      </div>
    </details>
  )
}

function FilterRuleEditor({ rule, columns, onChange, onRemove }: {
  rule: FilterRule
  columns: TableColumn[]
  onChange(rule: FilterRule): void
  onRemove(): void
}) {
  const column = columns.find(c => c.key === rule.column) || columns[0]
  const operators = operatorsFor(column.type)
  const needsValue = operatorNeedsValue(rule.operator)
  const isOptions = rule.operator === 'any_of' || rule.operator === 'none_of'

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-cyan-300/60 bg-cyan-50/50 px-2 py-1.5 dark:border-cyan-800 dark:bg-cyan-950/20">
      <select
        aria-label="عمود التصفية"
        value={column.key}
        onChange={(event) => {
          const next = columns.find(c => c.key === event.target.value)!
          onChange({ ...rule, column: next.key, operator: defaultOperator(next), value: '', values: [] })
        }}
        className="surface-field rounded-xl px-2 py-1 text-xs font-semibold"
      >
        {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <select
        aria-label="نوع المقارنة"
        value={rule.operator}
        onChange={event => onChange({ ...rule, operator: event.target.value as FilterRule['operator'] })}
        className="surface-field rounded-xl px-2 py-1 text-xs"
      >
        {operators.map(op => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
      </select>
      {needsValue && (isOptions ? (
        <OptionPicker column={column} selected={rule.values || []} onChange={values => onChange({ ...rule, values })} />
      ) : (
        <input
          aria-label="قيمة التصفية"
          type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
          value={rule.value}
          onChange={event => onChange({ ...rule, value: event.target.value })}
          placeholder="القيمة..."
          className="surface-field w-32 rounded-xl px-2 py-1 text-xs"
        />
      ))}
      <button type="button" onClick={onRemove} aria-label="حذف التصفية" className="px-1.5 text-base leading-none text-deep-400 hover:text-red-500">×</button>
    </div>
  )
}

function SortRuleEditor({ sort, columns, onChange, onRemove }: {
  sort: SortRule
  columns: TableColumn[]
  onChange(sort: SortRule): void
  onRemove(): void
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-violet-300/60 bg-violet-50/50 px-2 py-1.5 dark:border-violet-800 dark:bg-violet-950/20">
      <select aria-label="عمود الترتيب" value={sort.column} onChange={event => onChange({ ...sort, column: event.target.value })} className="surface-field rounded-xl px-2 py-1 text-xs font-semibold">
        {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <select aria-label="اتجاه الترتيب" value={sort.direction} onChange={event => onChange({ ...sort, direction: event.target.value as SortRule['direction'] })} className="surface-field rounded-xl px-2 py-1 text-xs">
        <option value="asc">تصاعدي ↑</option>
        <option value="desc">تنازلي ↓</option>
      </select>
      <button type="button" onClick={onRemove} aria-label="حذف الترتيب" className="px-1.5 text-base leading-none text-deep-400 hover:text-red-500">×</button>
    </div>
  )
}

function Cell({ column, student, onZoomPic }: { column: TableColumn; student: StudentInfo; onZoomPic?(url: string): void }) {
  if (column.key === 'name') {
    const pic = mediaUrl(student.profile_pic)
    return (
      <span className="flex min-w-0 items-center gap-2">
        {pic ? (
          <button type="button" onClick={(event) => { event.stopPropagation(); onZoomPic?.(pic) }} aria-label="تكبير الصورة" className="shrink-0 rounded-full"><img src={pic} alt="" className="h-7 w-7 shrink-0 rounded-full border border-water-300 object-cover hover:opacity-80" /></button>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-water-300 bg-water-200/50 text-xs text-deep-400">{student.name.charAt(0)}</span>
        )}
        <span className="line-clamp-2 font-semibold leading-5 text-deep-900">{student.name}</span>
      </span>
    )
  }
  if (column.key === 'status') {
    return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[student.status] || STATUS_STYLES['غير مقيد']}`}>{student.status}</span>
  }
  if (column.type === 'multi') {
    const values = column.value(student) as string[]
    return (
      <span className="flex flex-wrap gap-1">
        {values.map(value => <span key={value} className="rounded-md bg-water-200/50 px-1.5 py-0.5 text-xs text-deep-700">{value}</span>)}
      </span>
    )
  }
  if (column.key === 'warnings') {
    const count = student.warnings?.length || 0
    return count > 0 ? <span className="font-semibold text-red-600 dark:text-red-400">{count}</span> : <span className="text-deep-400">0</span>
  }
  const text = formatCell(column, student)
  const ltr = column.key === 'phone' || column.key === 'parent_phones' || column.type === 'date'
  return <span dir={ltr ? 'ltr' : undefined} className={column.type === 'checkbox' ? 'text-emerald-600' : ''}>{text}</span>
}

export default function StudentsTableView({ students, onViewStudent, onEditStudent, onMoveStudent, onDeleteStudent, onZoomPic }: {
  students: StudentInfo[]
  onViewStudent(student: StudentInfo): void
  onEditStudent(student: StudentInfo): void
  onMoveStudent(student: StudentInfo): void
  onDeleteStudent(id: number): void
  onZoomPic?(url: string): void
}) {
  const [customFields, setCustomFields] = useState<StudentCustomField[]>([])
  const [view, setView] = useState<TableViewState>(defaultTableView)
  const [hydrated, setHydrated] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const isPhone = useIsPhone()

  useEffect(() => {
    setView(loadView())
    setHydrated(true)
    api.getStudentCustomFields().then(result => setCustomFields(result.fields)).catch(() => setCustomFields([]))
  }, [])

  useEffect(() => { if (hydrated) saveView(view) }, [view, hydrated])

  const columns = useMemo(() => buildStudentColumns(students, customFields), [students, customFields])
  const visibleColumns = columns.filter(column => isColumnVisible(column, view.toggledColumns))
  const rows = useMemo(() => applyTableView(students, columns, view), [students, columns, view])
  const groupColumn = columns.find(column => column.key === view.groupBy)
  const groups = useMemo(() => groupStudents(rows, groupColumn), [rows, groupColumn])

  const update = (patch: Partial<TableViewState>) => setView(current => ({ ...current, ...patch }))

  const addFilter = () => {
    const column = columns.find(c => c.key === 'status') || columns[0]
    update({ filters: [...view.filters, { id: newRuleId(), column: column.key, operator: defaultOperator(column), value: '', values: [] }] })
  }

  const addSort = () => {
    const used = new Set(view.sorts.map(sort => sort.column))
    const column = columns.find(c => !used.has(c.key)) || columns[0]
    update({ sorts: [...view.sorts, { column: column.key, direction: 'asc' }] })
  }

  const toggleColumn = (key: string) => {
    const toggled = view.toggledColumns.includes(key)
      ? view.toggledColumns.filter(item => item !== key)
      : [...view.toggledColumns, key]
    update({ toggledColumns: toggled })
  }

  // Header click cycles asc → desc → off. Shift-click adds a secondary sort.
  const onHeaderClick = (key: string, additive: boolean) => {
    const existing = view.sorts.find(sort => sort.column === key)
    const nextRule: SortRule | null = !existing ? { column: key, direction: 'asc' } : existing.direction === 'asc' ? { column: key, direction: 'desc' } : null
    if (additive) {
      const others = view.sorts.filter(sort => sort.column !== key)
      update({ sorts: nextRule ? (existing ? view.sorts.map(sort => (sort.column === key ? nextRule : sort)) : [...others, nextRule]) : others })
    } else {
      update({ sorts: nextRule ? [nextRule] : [] })
    }
  }

  const exportCsv = () => {
    const csv = toCsv(rows, visibleColumns)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleGroup = (key: string) => setCollapsedGroups((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const hasCustomView = view.search || view.filters.length > 0 || view.sorts.length > 0 || view.groupBy || view.toggledColumns.length > 0
  const activeFilterCount = view.filters.length

  const renderRow = (student: StudentInfo, keyPrefix = '') => (
    <tr key={`${keyPrefix}${student.id}`} onClick={() => onViewStudent(student)} tabIndex={0} aria-label={`فتح ملف ${student.name}`} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onViewStudent(student) } }} className="group cursor-pointer border-t border-water-200/30 hover:bg-water-100/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500">
      {visibleColumns.map((column, index) => (
        <td
          key={column.key}
          className={`px-3 py-2 align-middle text-deep-700 ${index === 0 ? 'data-table-sticky sticky right-0 z-10 min-w-[200px]' : 'whitespace-nowrap'}`}
        >
          <Cell column={column} student={student} onZoomPic={onZoomPic} />
        </td>
      ))}
      <td className="whitespace-nowrap px-3 py-2 text-left" onClick={event => event.stopPropagation()}>
        <span className="inline-flex gap-2 opacity-70 group-hover:opacity-100">
          <button type="button" onClick={() => onEditStudent(student)} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">تعديل</button>
          <button type="button" onClick={() => onMoveStudent(student)} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">نقل</button>
          <button type="button" onClick={() => onDeleteStudent(student.id)} className="text-xs text-red-400 hover:text-red-600">حذف</button>
        </span>
      </td>
    </tr>
  )

  const renderCard = (student: StudentInfo, keyPrefix = '') => {
    const nameColumn = columns.find(column => column.key === 'name')
    const statusColumn = visibleColumns.find(column => column.key === 'status')
    const details = visibleColumns.filter(column => column.key !== 'name' && column.key !== 'status' && hasCellValue(column, student))
    return (
      <li key={`${keyPrefix}${student.id}`} className="border-t border-water-200/40 first:border-t-0">
        <div
          role="button"
          tabIndex={0}
          aria-label={`فتح ملف ${student.name}`}
          onClick={() => onViewStudent(student)}
          onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onViewStudent(student) } }}
          className="block cursor-pointer px-4 py-3 active:bg-water-100/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">{nameColumn && <Cell column={nameColumn} student={student} onZoomPic={onZoomPic} />}</div>
            {statusColumn && student.status && <Cell column={statusColumn} student={student} />}
          </div>
          {details.length > 0 && (
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              {details.map(column => (
                <div key={column.key} className={`min-w-0 ${column.type === 'multi' || column.key === 'parent_phones' ? 'col-span-2' : ''}`}>
                  <dt className="truncate text-xs text-deep-400">{column.label}</dt>
                  <dd className="break-words text-deep-700"><Cell column={column} student={student} onZoomPic={onZoomPic} /></dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="flex gap-1 px-2 pb-2" onClick={event => event.stopPropagation()}>
          <button type="button" onClick={() => onEditStudent(student)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 active:bg-water-100/60 dark:text-blue-400">تعديل</button>
          <button type="button" onClick={() => onMoveStudent(student)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 active:bg-water-100/60 dark:text-blue-400">نقل</button>
          <button type="button" onClick={() => onDeleteStudent(student.id)} className="ms-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 active:bg-red-50 dark:active:bg-red-950/40">حذف</button>
        </div>
      </li>
    )
  }

  return (
    <div>
      {/* Toolbar: two rows on phones (search + view actions, then filter/sort/group), one row on desktop. */}
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 md:flex md:flex-wrap">
        <label className="relative min-w-0 md:min-w-[200px] md:flex-1">
          <span className="sr-only">بحث في الجدول</span>
          <Icon name="search" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-400" />
          <input value={view.search} onChange={event => update({ search: event.target.value })} placeholder="بحث بالاسم أو أي حقل..." className="surface-field w-full rounded-xl py-2 pr-9 pl-8 text-sm" />
          {view.search && <button type="button" onClick={() => update({ search: '' })} aria-label="مسح البحث" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-deep-400">×</button>}
        </label>
        <details className="relative">
          <summary aria-label="الأعمدة" className="water-btn-outline inline-flex cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 py-2 text-sm"><Icon name="columns" className="h-4 w-4" /><span className="hidden sm:inline">الأعمدة</span></summary>
          <div className="glass-card absolute left-0 z-30 mt-1 max-h-80 w-60 overflow-y-auto rounded-xl p-2 shadow-lg">
            {columns.map(column => (
              <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-deep-800 hover:bg-water-100/40">
                <input type="checkbox" disabled={column.key === 'name'} checked={isColumnVisible(column, view.toggledColumns)} onChange={() => toggleColumn(column.key)} />
                {column.label}
              </label>
            ))}
          </div>
        </details>
        <button type="button" onClick={exportCsv} disabled={rows.length === 0} aria-label="تصدير CSV" className="water-btn-outline inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm disabled:opacity-50"><Icon name="download" className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
        <div className="col-span-3 flex flex-wrap items-center gap-2 md:contents">
          <button type="button" onClick={addFilter} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm ${activeFilterCount ? 'water-btn text-white' : 'water-btn-outline'}`}>
            <Icon name="filter" className="h-4 w-4" /> تصفية{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
          <button type="button" onClick={addSort} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm ${view.sorts.length ? 'water-btn text-white' : 'water-btn-outline'}`}>
            <Icon name="sort" className="h-4 w-4" /> ترتيب{view.sorts.length ? ` (${view.sorts.length})` : ''}
          </button>
          <label className="flex items-center gap-1.5 text-sm text-deep-600">
            <span className="sr-only md:not-sr-only">تجميع:</span>
            <select value={view.groupBy} onChange={event => { update({ groupBy: event.target.value }); setCollapsedGroups(new Set()) }} aria-label="تجميع حسب" className="surface-field max-w-[8.5rem] rounded-xl px-2 py-2 text-sm md:max-w-none">
              <option value="">بلا تجميع</option>
              {columns.filter(c => c.type === 'select' || c.type === 'multi' || c.type === 'checkbox').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          {hasCustomView && <button type="button" onClick={() => { setView(defaultTableView()); setCollapsedGroups(new Set()) }} className="rounded-xl px-3 py-2 text-sm text-deep-500 hover:text-red-500">إعادة الضبط</button>}
        </div>
      </div>

      {(view.filters.length > 0 || view.sorts.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {view.sorts.map((sort, index) => (
            <SortRuleEditor
              key={`${sort.column}-${index}`}
              sort={sort}
              columns={columns}
              onChange={next => update({ sorts: view.sorts.map((item, i) => (i === index ? next : item)) })}
              onRemove={() => update({ sorts: view.sorts.filter((_, i) => i !== index) })}
            />
          ))}
          {view.filters.map(rule => (
            <FilterRuleEditor
              key={rule.id}
              rule={rule}
              columns={columns}
              onChange={next => update({ filters: view.filters.map(item => (item.id === rule.id ? next : item)) })}
              onRemove={() => update({ filters: view.filters.filter(item => item.id !== rule.id) })}
            />
          ))}
        </div>
      )}

      <p className="mb-2 text-xs text-deep-500">
        {rows.length === students.length ? `${students.length} طالب` : `${rows.length} من ${students.length} طالب`}
        <span className="mx-2 hidden md:inline">·</span>
        <span className="hidden md:inline">اضغط على عنوان العمود للترتيب، و Shift + ضغط لإضافة ترتيب ثانوي</span>
      </p>

      {isPhone ? (
        <div className="glass-card overflow-hidden rounded-2xl">
          {rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-deep-400">لا يوجد طلاب مطابقون</p>
          ) : groupColumn ? groups.map(group => {
            const collapsed = collapsedGroups.has(group.key)
            return (
              <section key={`group-${group.key}`} className="border-t border-water-200/40 first:border-t-0">
                <button type="button" onClick={() => toggleGroup(group.key)} aria-expanded={!collapsed} className="flex w-full items-center gap-2 bg-water-100/40 px-4 py-2.5 text-sm font-bold text-deep-800">
                  <Icon name="chevron-down" className={`h-4 w-4 text-deep-400 transition-transform ${collapsed ? 'rotate-90' : ''}`} />
                  <span className="min-w-0 flex-1 truncate text-right">{groupColumn.label}: {group.key}</span>
                  <span className="rounded-full bg-water-200/60 px-2 py-0.5 text-xs font-medium text-deep-600">{group.students.length}</span>
                </button>
                {!collapsed && <ul>{group.students.map(student => renderCard(student, `${group.key}:`))}</ul>}
              </section>
            )
          }) : <ul>{rows.map(student => renderCard(student))}</ul>}
        </div>
      ) : (
      <div className="glass-card overflow-clip rounded-2xl">
        <ScrollableTable>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {visibleColumns.map((column, index) => {
                  const sortIndex = view.sorts.findIndex(sort => sort.column === column.key)
                  const sort = view.sorts[sortIndex]
                  return (
                    <th
                      key={column.key}
                      aria-sort={sort ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={`data-table-header whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-deep-700 ${index === 0 ? 'sticky right-0 z-20' : ''}`}
                    >
                      <button type="button" onClick={event => onHeaderClick(column.key, event.shiftKey)} className="inline-flex items-center gap-1 hover:text-blue-700">
                        {column.label}
                        <span className={sort ? 'text-blue-600 dark:text-blue-400' : 'text-deep-300'}>
                          {sort ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                          {sort && view.sorts.length > 1 && <sub>{sortIndex + 1}</sub>}
                        </span>
                      </button>
                    </th>
                  )
                })}
                <th className="data-table-header px-3 py-2.5" aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={visibleColumns.length + 1} className="px-5 py-8 text-center text-sm text-deep-400">لا يوجد طلاب مطابقون</td></tr>
              ) : groupColumn ? groups.map(group => {
                const collapsed = collapsedGroups.has(group.key)
                return [
                  <tr key={`group-${group.key}`} className="border-t border-water-200/40 bg-water-100/40">
                    <td colSpan={visibleColumns.length + 1} className="px-3 py-2">
                      <button type="button" onClick={() => toggleGroup(group.key)} aria-expanded={!collapsed} className="sticky right-3 inline-flex items-center gap-2 text-sm font-bold text-deep-800">
                        <span className={`text-deep-400 transition-transform ${collapsed ? '' : '-rotate-90'}`}>{'<'}</span>
                        {groupColumn.label}: {group.key}
                        <span className="rounded-full bg-water-200/60 px-2 py-0.5 text-xs font-medium text-deep-600">{group.students.length}</span>
                      </button>
                    </td>
                  </tr>,
                  ...(collapsed ? [] : group.students.map(student => renderRow(student, `${group.key}:`))),
                ]
              }) : rows.map(student => renderRow(student))}
            </tbody>
          </table>
        </ScrollableTable>
      </div>
      )}
    </div>
  )
}

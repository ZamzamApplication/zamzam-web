'use client'

import { useEffect, useState } from 'react'
import type { ExcelExportTemplates, ExcelTemplateColumn, ExcelTemplateKey, ExcelTemplateSubcolumn } from '@/lib/excel-templates'
import { api } from '@/lib/api'
import Icon from '@/components/Icon'
import type { StudentCustomField } from '@/lib/types'

const TEMPLATE_LABELS: Record<ExcelTemplateKey, { title: string; description: string }> = {
  attendance: {
    title: 'سجل الحضور',
    description: 'خيار الحضور يضيف عموداً لكل حلقة بعنوان تاريخها.',
  },
  statistics: {
    title: 'إحصائيات الطلاب',
    description: 'الأعمدة المستخدمة في ورقة نسب وإجماليات الحضور.',
  },
  progress: {
    title: 'الحفظ والمراجعة',
    description: 'الأعمدة المستخدمة في ورقة تقدم القرآن عند تفعيل المتابعة.',
  },
}

function NumberSettingInput({
  value,
  min,
  max,
  onChange,
  className,
  ariaLabel,
}: {
  value: number
  min: number
  max: number
  onChange(value: number): void
  className: string
  ariaLabel?: string
}) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = () => {
    const parsed = Number(draft)
    const nextValue = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, parsed))
      : value
    setDraft(String(nextValue))
    if (nextValue !== value) onChange(nextValue)
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      className={className}
      aria-label={ariaLabel}
    />
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  return (
    <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-deep-600">
      <span>{label}</span>
      <span className="inline-flex items-center gap-2 rounded-xl border border-water-200 bg-white/60 py-1 pe-1 ps-2.5 dark:border-slate-700 dark:bg-slate-800/60">
        <span dir="ltr" className="font-mono text-xs text-deep-500">{value}</span>
        <input type="color" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} aria-label={label} className="h-7 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
      </span>
    </label>
  )
}

export default function ExcelTemplateSettings({
  value,
  onChange,
}: {
  value: ExcelExportTemplates
  onChange(value: ExcelExportTemplates): void
}) {
  const [openTemplate, setOpenTemplate] = useState<ExcelTemplateKey | null>('attendance')
  const [studentFields, setStudentFields] = useState<StudentCustomField[]>([])
  // Phones show a column's sizes only on request to keep each row on one line.
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set())
  const toggleExpanded = (id: string) => setExpandedColumns(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  useEffect(() => {
    api.getStudentCustomFields().then(result => setStudentFields(result.fields)).catch(() => {})
  }, [])

  const updateColumns = (key: ExcelTemplateKey, columns: ExcelTemplateColumn[]) => {
    onChange({ ...value, [key]: { ...value[key], columns } })
  }

  const updateTemplate = (key: ExcelTemplateKey, patch: Partial<ExcelExportTemplates[ExcelTemplateKey]>) => {
    onChange({ ...value, [key]: { ...value[key], ...patch } })
  }

  const updateColumn = (key: ExcelTemplateKey, id: string, patch: Partial<ExcelTemplateColumn>) => {
    updateColumns(key, value[key].columns.map((column) => column.id === id ? { ...column, ...patch } : column))
  }

  const moveColumn = (key: ExcelTemplateKey, index: number, direction: -1 | 1) => {
    const columns = [...value[key].columns]
    const target = index + direction
    if (target < 0 || target >= columns.length) return
    ;[columns[index], columns[target]] = [columns[target], columns[index]]
    updateColumns(key, columns)
  }

  const addCustomColumn = (key: ExcelTemplateKey) => {
    const uniquePart = globalThis.crypto?.randomUUID?.().replaceAll('-', '') || `${Date.now()}`
    updateColumns(key, [
      ...value[key].columns,
      {
        id: `custom_${uniquePart}`,
        label: 'عمود مخصص',
        enabled: true,
        custom: true,
        width: 18,
        header_font_size: value[key].header_font_size,
        show_header: true,
        subcolumns: [],
      },
    ])
  }

  const addStudentFieldColumn = (key: ExcelTemplateKey, field: StudentCustomField) => {
    const id = `custom_field_${field.id}`
    if (value[key].columns.some(column => column.id === id)) return
    updateColumns(key, [...value[key].columns, {
      id,
      label: field.name,
      enabled: true,
      custom: true,
      width: 18,
      header_font_size: value[key].header_font_size,
      show_header: true,
      subcolumns: [],
    }])
  }

  const removeCustomColumn = (key: ExcelTemplateKey, id: string) => {
    updateColumns(key, value[key].columns.filter((column) => column.id !== id))
  }

  const subcolumn = (label: string): ExcelTemplateSubcolumn => ({
    id: `sub_${globalThis.crypto?.randomUUID?.().replaceAll('-', '') || Date.now()}`,
    label,
    width: 18,
  })

  const addSubcolumns = (key: ExcelTemplateKey, column: ExcelTemplateColumn) => {
    updateColumn(key, column.id, {
      subcolumns: column.subcolumns.length >= 2
        ? [...column.subcolumns, subcolumn(`فرع ${column.subcolumns.length + 1}`)]
        : [subcolumn('الفرع الأول'), subcolumn('الفرع الثاني')],
    })
  }

  const updateSubcolumn = (
    key: ExcelTemplateKey,
    column: ExcelTemplateColumn,
    subcolumnId: string,
    patch: Partial<ExcelTemplateSubcolumn>,
  ) => {
    updateColumn(key, column.id, {
      subcolumns: column.subcolumns.map((item) => item.id === subcolumnId ? { ...item, ...patch } : item),
    })
  }

  return (
    <div className="mt-4 grid min-w-0 grid-cols-1 gap-4">
      {(Object.keys(TEMPLATE_LABELS) as ExcelTemplateKey[]).map((key) => {
        const template = value[key]
        const enabledCount = template.columns.filter((column) => column.enabled).length
        return (
          <section key={key} className="min-w-0 overflow-hidden rounded-2xl border border-water-200 bg-white/40 dark:bg-slate-800/40">
            <button
              type="button"
              data-immediate-action
              onClick={() => setOpenTemplate((current) => current === key ? null : key)}
              aria-expanded={openTemplate === key}
              aria-controls={`excel-template-${key}`}
              className="flex w-full items-center justify-between gap-4 p-4 text-right transition hover:bg-water-50/60 dark:hover:bg-slate-700/30"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-deep-800">{TEMPLATE_LABELS[key].title}</span>
                <span className="mt-1 block text-xs text-deep-500">{TEMPLATE_LABELS[key].description}</span>
              </span>
              <span className={`shrink-0 text-blue-700 transition-transform ${openTemplate === key ? 'rotate-180' : ''}`} aria-hidden="true"><Icon name="chevron-down" className="h-5 w-5" /></span>
            </button>
            {openTemplate === key && <div id={`excel-template-${key}`} className="min-w-0 border-t border-water-200/70 p-3 sm:p-4">
            <div className="mt-3 grid gap-3 rounded-xl border border-water-200/70 bg-white/45 p-3 sm:grid-cols-2 lg:grid-cols-3 dark:bg-slate-900/30">
              <ColorField label="لون الخلفية" value={template.header_background_color} onChange={(header_background_color) => updateTemplate(key, { header_background_color })} />
              <ColorField label="لون الخط" value={template.header_font_color} onChange={(header_font_color) => updateTemplate(key, { header_font_color })} />
              <label className="flex min-h-9 items-center gap-2 text-xs font-semibold text-deep-700">
                <input
                  type="checkbox"
                  checked={template.header_bold}
                  onChange={(event) => updateTemplate(key, { header_bold: event.target.checked })}
                  className="h-4 w-4 accent-cyan-600"
                />
                خط عريض
              </label>
            </div>
            <div className="mt-3 grid gap-3 rounded-xl border border-water-200/70 bg-white/45 p-3 sm:grid-cols-2 lg:grid-cols-5 dark:bg-slate-900/30">
              <label className="grid gap-1 text-xs text-deep-600 sm:col-span-2">
                خط محتوى الخلايا
                <input
                  list={`excel-cell-fonts-${key}`}
                  value={template.cell_font_family}
                  onChange={(event) => updateTemplate(key, { cell_font_family: event.target.value })}
                  maxLength={80}
                  required
                  placeholder="Arial"
                  className="surface-field rounded-xl px-3 py-1.5 text-sm"
                />
                <datalist id={`excel-cell-fonts-${key}`}>
                  <option value="Arial" />
                  <option value="Calibri" />
                  <option value="Tahoma" />
                  <option value="Traditional Arabic" />
                  <option value="Amiri" />
                </datalist>
              </label>
              <label className="grid gap-1 text-xs text-deep-600">
                حجم خط الخلايا
                <NumberSettingInput
                  min={6}
                  max={72}
                  value={template.cell_font_size}
                  onChange={(cell_font_size) => updateTemplate(key, { cell_font_size })}
                  className="surface-field rounded-xl px-2 py-1.5 text-center text-sm"
                />
              </label>
              <ColorField label="لون خط الخلايا" value={template.cell_font_color} onChange={(cell_font_color) => updateTemplate(key, { cell_font_color })} />
              <label className="flex min-h-9 items-center gap-2 text-xs font-semibold text-deep-700">
                <input
                  type="checkbox"
                  checked={template.cell_bold}
                  onChange={(event) => updateTemplate(key, { cell_bold: event.target.checked })}
                  className="h-4 w-4 accent-cyan-600"
                />
                خط الخلايا عريض
              </label>
            </div>
            {key === 'attendance' && (
              <div className="mt-3 grid gap-3 rounded-xl border border-water-200/70 bg-white/45 p-3 sm:grid-cols-2 lg:grid-cols-5 dark:bg-slate-900/30">
                <label className="grid gap-1 text-xs text-deep-600 sm:col-span-2">
                  خط تواريخ الحضور
                  <input
                    list="excel-date-fonts"
                    value={template.date_font_family}
                    onChange={(event) => updateTemplate(key, { date_font_family: event.target.value })}
                    maxLength={80}
                    required
                    placeholder="Arial"
                    className="surface-field rounded-xl px-3 py-1.5 text-sm"
                  />
                  <datalist id="excel-date-fonts">
                    <option value="Arial" />
                    <option value="Calibri" />
                    <option value="Tahoma" />
                    <option value="Traditional Arabic" />
                    <option value="Amiri" />
                  </datalist>
                </label>
                <label className="grid gap-1 text-xs text-deep-600">
                  حجم خط التاريخ
                  <NumberSettingInput
                    min={6}
                    max={72}
                    value={template.date_font_size}
                    onChange={(date_font_size) => updateTemplate(key, { date_font_size })}
                    className="surface-field rounded-xl px-2 py-1.5 text-center text-sm"
                  />
                </label>
                <ColorField label="لون خط التاريخ" value={template.date_font_color} onChange={(date_font_color) => updateTemplate(key, { date_font_color })} />
                <label className="flex min-h-9 items-center gap-2 text-xs font-semibold text-deep-700">
                  <input
                    type="checkbox"
                    checked={template.date_bold}
                    onChange={(event) => updateTemplate(key, { date_bold: event.target.checked })}
                    className="h-4 w-4 accent-cyan-600"
                  />
                  خط التاريخ عريض
                </label>
              </div>
            )}
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 [&>*]:min-w-0">
              {template.columns.map((column, index) => (
                <div key={column.id} className={`rounded-xl border p-2.5 ${column.enabled ? 'border-water-200/80 bg-white/55 dark:bg-slate-900/35' : 'border-dashed border-water-200/80 bg-transparent opacity-75'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={column.enabled}
                      disabled={column.enabled && enabledCount === 1}
                      onChange={(event) => updateColumn(key, column.id, { enabled: event.target.checked })}
                      aria-label={`تضمين عمود ${column.label}`}
                      title="تضمين في الملف"
                      className="h-5 w-5 shrink-0 accent-cyan-600"
                    />
                    <input
                      value={column.label}
                      onChange={(event) => updateColumn(key, column.id, { label: event.target.value })}
                      maxLength={80}
                      required
                      aria-label={`اسم عمود ${column.label}`}
                      className="surface-field min-w-0 flex-1 rounded-xl px-3 py-1.5 text-sm"
                    />
                    <div className={`order-last basis-full items-center gap-3 pt-1 sm:order-none sm:basis-auto sm:pt-0 ${expandedColumns.has(column.id) ? 'flex' : 'hidden'} sm:flex`}>
                      <label className="flex items-center gap-1.5 text-xs text-deep-500">
                        حجم العنوان
                        <NumberSettingInput
                          min={6}
                          max={72}
                          value={column.header_font_size}
                          onChange={(header_font_size) => updateColumn(key, column.id, { header_font_size })}
                          className="surface-field w-14 rounded-xl px-1 py-1.5 text-center text-xs"
                          ariaLabel={`حجم عنوان ${column.label}`}
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-deep-500">
                        العرض
                        <input
                          type="number"
                          min={1}
                          max={60}
                          inputMode="numeric"
                          value={column.width}
                          onChange={(event) => updateColumn(key, column.id, {
                            width: Math.min(60, Math.max(1, Number(event.target.value) || 1)),
                          })}
                          className="surface-field w-14 rounded-xl px-1 py-1.5 text-center text-xs"
                          aria-label={`عرض عمود ${column.label}`}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      data-immediate-action
                      onClick={() => toggleExpanded(column.id)}
                      aria-expanded={expandedColumns.has(column.id)}
                      aria-label={`مقاسات عمود ${column.label}`}
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border sm:hidden ${expandedColumns.has(column.id) ? 'border-cyan-400 text-cyan-700 dark:text-cyan-300' : 'border-water-200 text-deep-500'}`}
                    >
                      <Icon name="settings" className="h-4 w-4" />
                    </button>
                    <div className="inline-flex shrink-0 overflow-hidden rounded-xl border border-water-200 dark:border-slate-700">
                      <button type="button" disabled={index === 0} onClick={() => moveColumn(key, index, -1)} aria-label={`تحريك ${column.label} لأعلى`} className="grid h-9 w-9 place-items-center disabled:opacity-30"><Icon name="chevron-down" className="h-4 w-4 rotate-180" /></button>
                      <button type="button" disabled={index === template.columns.length - 1} onClick={() => moveColumn(key, index, 1)} aria-label={`تحريك ${column.label} لأسفل`} className="grid h-9 w-9 place-items-center border-r border-water-200 disabled:opacity-30 dark:border-slate-700"><Icon name="chevron-down" className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {column.id === 'attendance' && <p className="mt-1.5 text-xs text-deep-500">يتوسع إلى تواريخ الحلقات</p>}
                  {column.custom && (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => addSubcolumns(key, column)} disabled={column.subcolumns.length >= 10} className="text-xs font-semibold text-blue-700 disabled:opacity-40 dark:text-blue-300">
                        {column.subcolumns.length >= 2 ? '+ فرع' : 'تقسيم لفرعين'}
                      </button>
                      {column.subcolumns.length >= 2 && (
                        <button type="button" onClick={() => updateColumn(key, column.id, { subcolumns: [] })} className="text-xs text-deep-500">
                          إلغاء التقسيم
                        </button>
                      )}
                      <button type="button" onClick={() => removeCustomColumn(key, column.id)} className="text-xs font-semibold text-red-500">
                        حذف
                      </button>
                    </div>
                  )}
                  {column.id === 'attendance' && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-water-200/60 pt-2">
                      <label className="flex items-center gap-2 text-xs text-deep-600">
                        <input
                          type="checkbox"
                          checked={column.show_header}
                          onChange={(event) => updateColumn(key, column.id, { show_header: event.target.checked })}
                          className="h-4 w-4 accent-cyan-600"
                        />
                        إظهار تاريخ كل حلقة في رأس العمود
                      </label>
                      {column.show_header && (
                        <label className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-xs text-deep-600">
                          تنسيق التاريخ
                          <select
                            value={template.attendance_date_format}
                            onChange={(event) => updateTemplate(key, {
                              attendance_date_format: event.target.value as ExcelExportTemplates[ExcelTemplateKey]['attendance_date_format'],
                            })}
                            className="surface-field min-w-0 max-w-full rounded-xl px-2 py-1.5 text-xs"
                          >
                            <option value="day">رقم اليوم فقط — 28</option>
                            <option value="day_month">اليوم والشهر — 28/07</option>
                            <option value="day_month_year">اليوم والشهر والسنة — 28/07/2026</option>
                            <option value="weekday">اسم اليوم فقط — الثلاثاء</option>
                            <option value="weekday_day">اسم اليوم ورقمه — الثلاثاء 28</option>
                            <option value="weekday_day_month">اسم اليوم واليوم والشهر — الثلاثاء 28/07</option>
                            <option value="weekday_day_month_year">اسم اليوم والتاريخ الكامل — الثلاثاء 28/07/2026</option>
                          </select>
                        </label>
                      )}
                    </div>
                  )}
                  {column.subcolumns.length >= 2 && (
                    <div className="mt-2 grid gap-2 border-t border-water-200/60 pt-2 sm:grid-cols-2">
                      {column.subcolumns.map((child) => (
                        <div key={child.id} className="flex items-center gap-2 rounded-xl bg-water-50/60 p-2 dark:bg-slate-800/60">
                          <input
                            value={child.label}
                            onChange={(event) => updateSubcolumn(key, column, child.id, { label: event.target.value })}
                            required
                            maxLength={80}
                            className="surface-field min-w-0 flex-1 rounded-xl px-2 py-1.5 text-xs"
                            aria-label={`اسم الفرع ${child.label}`}
                          />
                          <label className="flex items-center gap-1 text-xs text-deep-500">
                            العرض
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={child.width}
                              onChange={(event) => updateSubcolumn(key, column, child.id, {
                                width: Math.min(60, Math.max(1, Number(event.target.value) || 1)),
                              })}
                              className="surface-field w-14 rounded-xl px-1 py-1.5 text-center text-xs"
                            />
                          </label>
                          {column.subcolumns.length > 2 && (
                            <button
                              type="button"
                              onClick={() => updateColumn(key, column.id, {
                                subcolumns: column.subcolumns.filter((item) => item.id !== child.id),
                              })}
                              className="text-xs text-red-500"
                              aria-label={`حذف الفرع ${child.label}`}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => addCustomColumn(key)} className="water-btn-outline mt-3 rounded-xl px-4 py-2 text-xs font-semibold">
              + إضافة عمود فارغ
            </button>
            {key === 'attendance' && studentFields.length > 0 && <div className="mt-3 rounded-xl border border-water-200/70 p-3">
              <p className="text-xs font-bold text-deep-700">حقول الطلاب</p>
              <div className="mt-2 flex flex-wrap gap-2">{studentFields.map(field => {
                const added = template.columns.some(column => column.id === `custom_field_${field.id}`)
                return <button key={field.id} type="button" disabled={added} onClick={() => addStudentFieldColumn(key, field)} className="rounded-full border border-water-200 px-3 py-1.5 text-xs text-blue-700 disabled:opacity-40">{added ? '✓ ' : '+ '}{field.name}</button>
              })}</div>
            </div>}
            </div>}
          </section>
        )
      })}
    </div>
  )
}

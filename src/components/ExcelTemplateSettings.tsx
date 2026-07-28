'use client'

import type { ExcelExportTemplates, ExcelTemplateColumn, ExcelTemplateKey, ExcelTemplateSubcolumn } from '@/lib/excel-templates'

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

export default function ExcelTemplateSettings({
  value,
  onChange,
}: {
  value: ExcelExportTemplates
  onChange(value: ExcelExportTemplates): void
}) {
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
        show_header: true,
        subcolumns: [],
      },
    ])
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
    <div className="mt-4 grid gap-4">
      {(Object.keys(TEMPLATE_LABELS) as ExcelTemplateKey[]).map((key) => {
        const template = value[key]
        const enabledCount = template.columns.filter((column) => column.enabled).length
        return (
          <section key={key} className="rounded-2xl border border-water-200 bg-white/40 p-4 dark:bg-slate-800/40">
            <div>
              <h3 className="text-sm font-bold text-deep-800">{TEMPLATE_LABELS[key].title}</h3>
              <p className="mt-1 text-xs text-deep-500">{TEMPLATE_LABELS[key].description}</p>
            </div>
            <div className="mt-3 grid gap-3 rounded-xl border border-water-200/70 bg-white/45 p-3 sm:grid-cols-2 lg:grid-cols-5 dark:bg-slate-900/30">
              <label className="grid gap-1 text-xs text-deep-600 sm:col-span-2">
                خط العناوين
                <input
                  list={`excel-fonts-${key}`}
                  value={template.header_font_family}
                  onChange={(event) => updateTemplate(key, { header_font_family: event.target.value })}
                  maxLength={80}
                  required
                  placeholder="Arial"
                  className="surface-field rounded-lg px-3 py-1.5 text-sm"
                />
                <datalist id={`excel-fonts-${key}`}>
                  <option value="Arial" />
                  <option value="Calibri" />
                  <option value="Tahoma" />
                  <option value="Traditional Arabic" />
                  <option value="Amiri" />
                </datalist>
              </label>
              <label className="grid gap-1 text-xs text-deep-600">
                حجم الخط
                <input
                  type="number"
                  min={6}
                  max={72}
                  value={template.header_font_size}
                  onChange={(event) => updateTemplate(key, {
                    header_font_size: Math.min(72, Math.max(6, Number(event.target.value) || 6)),
                  })}
                  className="surface-field rounded-lg px-2 py-1.5 text-center text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs text-deep-600">
                لون الخلفية
                <input
                  type="color"
                  value={template.header_background_color}
                  onChange={(event) => updateTemplate(key, { header_background_color: event.target.value.toUpperCase() })}
                  className="surface-field h-9 w-full cursor-pointer rounded-lg p-1"
                />
              </label>
              <label className="grid gap-1 text-xs text-deep-600">
                لون الخط
                <input
                  type="color"
                  value={template.header_font_color}
                  onChange={(event) => updateTemplate(key, { header_font_color: event.target.value.toUpperCase() })}
                  className="surface-field h-9 w-full cursor-pointer rounded-lg p-1"
                />
              </label>
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
                  className="surface-field rounded-lg px-3 py-1.5 text-sm"
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
                <input
                  type="number"
                  min={6}
                  max={72}
                  value={template.cell_font_size}
                  onChange={(event) => updateTemplate(key, {
                    cell_font_size: Math.min(72, Math.max(6, Number(event.target.value) || 6)),
                  })}
                  className="surface-field rounded-lg px-2 py-1.5 text-center text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs text-deep-600">
                لون خط الخلايا
                <input
                  type="color"
                  value={template.cell_font_color}
                  onChange={(event) => updateTemplate(key, { cell_font_color: event.target.value.toUpperCase() })}
                  className="surface-field h-9 w-full cursor-pointer rounded-lg p-1"
                />
              </label>
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
                    className="surface-field rounded-lg px-3 py-1.5 text-sm"
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
                  <input
                    type="number"
                    min={6}
                    max={72}
                    value={template.date_font_size}
                    onChange={(event) => updateTemplate(key, {
                      date_font_size: Math.min(72, Math.max(6, Number(event.target.value) || 6)),
                    })}
                    className="surface-field rounded-lg px-2 py-1.5 text-center text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs text-deep-600">
                  لون خط التاريخ
                  <input
                    type="color"
                    value={template.date_font_color}
                    onChange={(event) => updateTemplate(key, { date_font_color: event.target.value.toUpperCase() })}
                    className="surface-field h-9 w-full cursor-pointer rounded-lg p-1"
                  />
                </label>
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
            <div className="mt-3 grid gap-2">
              {template.columns.map((column, index) => (
                <div key={column.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-water-200/80 bg-white/55 px-3 py-2 dark:bg-slate-900/35">
                  <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-deep-700">
                    <input
                      type="checkbox"
                      checked={column.enabled}
                      disabled={column.enabled && enabledCount === 1}
                      onChange={(event) => updateColumn(key, column.id, { enabled: event.target.checked })}
                      className="h-4 w-4 accent-cyan-600"
                    />
                    تضمين
                  </label>
                  <input
                    value={column.label}
                    onChange={(event) => updateColumn(key, column.id, { label: event.target.value })}
                    maxLength={80}
                    required
                    aria-label={`اسم عمود ${column.label}`}
                    className="surface-field min-w-40 flex-1 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-deep-500">
                    العرض
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={column.width}
                      onChange={(event) => updateColumn(key, column.id, {
                        width: Math.min(60, Math.max(1, Number(event.target.value) || 1)),
                      })}
                      className="surface-field w-16 rounded-lg px-2 py-1.5 text-center text-xs"
                      aria-label={`عرض عمود ${column.label}`}
                    />
                  </label>
                  {column.id === 'attendance' && <span className="text-[11px] text-deep-500">يتوسع إلى تواريخ الحلقات</span>}
                  <button type="button" disabled={index === 0} onClick={() => moveColumn(key, index, -1)} aria-label={`تحريك ${column.label} لأعلى`} className="rounded-lg border border-water-200 px-2 py-1 text-xs disabled:opacity-30">↑</button>
                  <button type="button" disabled={index === template.columns.length - 1} onClick={() => moveColumn(key, index, 1)} aria-label={`تحريك ${column.label} لأسفل`} className="rounded-lg border border-water-200 px-2 py-1 text-xs disabled:opacity-30">↓</button>
                  {column.custom && (
                    <>
                      <button type="button" onClick={() => addSubcolumns(key, column)} disabled={column.subcolumns.length >= 10} className="text-xs font-semibold text-cyan-700 disabled:opacity-40 dark:text-cyan-300">
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
                    </>
                  )}
                  {column.id === 'attendance' && (
                    <div className="flex w-full flex-wrap items-center gap-3 border-t border-water-200/60 pt-2">
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
                        <label className="flex items-center gap-2 text-xs text-deep-600">
                          تنسيق التاريخ
                          <select
                            value={template.attendance_date_format}
                            onChange={(event) => updateTemplate(key, {
                              attendance_date_format: event.target.value as ExcelExportTemplates[ExcelTemplateKey]['attendance_date_format'],
                            })}
                            className="surface-field rounded-lg px-2 py-1.5 text-xs"
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
                    <div className="grid w-full gap-2 border-t border-water-200/60 pt-2 sm:grid-cols-2">
                      {column.subcolumns.map((child) => (
                        <div key={child.id} className="flex items-center gap-2 rounded-lg bg-water-50/60 p-2 dark:bg-slate-800/60">
                          <input
                            value={child.label}
                            onChange={(event) => updateSubcolumn(key, column, child.id, { label: event.target.value })}
                            required
                            maxLength={80}
                            className="surface-field min-w-0 flex-1 rounded-lg px-2 py-1.5 text-xs"
                            aria-label={`اسم الفرع ${child.label}`}
                          />
                          <label className="flex items-center gap-1 text-[10px] text-deep-500">
                            العرض
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={child.width}
                              onChange={(event) => updateSubcolumn(key, column, child.id, {
                                width: Math.min(60, Math.max(1, Number(event.target.value) || 1)),
                              })}
                              className="surface-field w-14 rounded-lg px-1 py-1.5 text-center text-xs"
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
              + إضافة عمود مخصص
            </button>
          </section>
        )
      })}
    </div>
  )
}

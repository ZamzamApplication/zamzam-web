'use client'

import type { ExcelExportTemplates, ExcelTemplateColumn, ExcelTemplateKey } from '@/lib/excel-templates'

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
    onChange({ ...value, [key]: { columns } })
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
      { id: `custom_${uniquePart}`, label: 'عمود مخصص', enabled: true, custom: true, width: 18 },
    ])
  }

  const removeCustomColumn = (key: ExcelTemplateKey, id: string) => {
    updateColumns(key, value[key].columns.filter((column) => column.id !== id))
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
                      min={8}
                      max={60}
                      value={column.width}
                      onChange={(event) => updateColumn(key, column.id, {
                        width: Math.min(60, Math.max(8, Number(event.target.value) || 8)),
                      })}
                      className="surface-field w-16 rounded-lg px-2 py-1.5 text-center text-xs"
                      aria-label={`عرض عمود ${column.label}`}
                    />
                  </label>
                  {column.id === 'attendance' && <span className="text-[11px] text-deep-500">يتوسع إلى تواريخ الحلقات</span>}
                  <button type="button" disabled={index === 0} onClick={() => moveColumn(key, index, -1)} aria-label={`تحريك ${column.label} لأعلى`} className="rounded-lg border border-water-200 px-2 py-1 text-xs disabled:opacity-30">↑</button>
                  <button type="button" disabled={index === template.columns.length - 1} onClick={() => moveColumn(key, index, 1)} aria-label={`تحريك ${column.label} لأسفل`} className="rounded-lg border border-water-200 px-2 py-1 text-xs disabled:opacity-30">↓</button>
                  {column.custom && (
                    <button type="button" onClick={() => removeCustomColumn(key, column.id)} className="text-xs font-semibold text-red-500">
                      حذف
                    </button>
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

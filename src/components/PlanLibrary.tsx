'use client'

import { useState } from 'react'

import type { SavedPlanSummary } from '@/lib/personal-plans'

export default function PlanLibrary({ plans, busy, selectedId, onOpen, onStatus, onDelete, onNew }: {
  plans: SavedPlanSummary[]
  busy: boolean
  selectedId?: string
  onOpen(plan: SavedPlanSummary): void
  onStatus(plan: SavedPlanSummary, changes: { completed?: boolean; archived?: boolean }): void
  onDelete(plan: SavedPlanSummary): void
  onNew(): void
}) {
  const [filter, setFilter] = useState('all')
  const visible = plans.filter(plan => filter === 'all' || (filter === 'archived' ? plan.archived : filter === 'completed' ? plan.completed && !plan.archived : !plan.archived && !plan.completed))
  return <section aria-label="خططي المحفوظة" className="mb-6 rounded-2xl border border-water-200 bg-white/75 p-4 dark:border-slate-700 dark:bg-slate-900/75 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-deep-900">خططي المحفوظة</h2>
      <div className="flex flex-wrap gap-2">
        <select aria-label="عرض الخطط" value={filter} onChange={event => setFilter(event.target.value)} className="surface-field rounded-lg px-3 py-2 text-sm"><option value="all">كل الخطط</option><option value="active">الجارية</option><option value="completed">المكتملة</option><option value="archived">الأرشيف</option></select>
        <button type="button" disabled={busy} onClick={onNew} className="water-btn-outline rounded-lg px-3 py-2 text-sm font-bold">+ خطة جديدة</button>
      </div>
    </div>
    {!visible.length && <p className="mt-4 text-sm text-deep-500">لا توجد خطط هنا. أنشئ خطة ثم احفظها باسم تختاره.</p>}
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{visible.map(plan => <article key={plan.id} className={`rounded-xl border p-3 ${selectedId === plan.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/25' : 'border-slate-200 dark:border-slate-700'}`}>
      <h3 className="break-words font-bold text-deep-900">{plan.name}</h3>
      <p className="mt-1 text-xs text-deep-500">{plan.archived ? 'مؤرشفة' : plan.completed ? 'مكتملة ✓' : 'جارية'} · {plan.share_mode === 'private' ? 'خاصة' : plan.share_mode === 'readonly' ? 'رابط للقراءة فقط' : 'رابط للقراءة وتسجيل الإنجاز'} · <bdi dir="ltr">{plan.completed_dates.length} / {plan.study_dates.length}</bdi> يوم</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => onOpen(plan)} className="water-btn-outline rounded-lg px-3 py-2 text-xs font-bold">فتح وتعديل</button>
        <button type="button" disabled={busy} onClick={() => onStatus(plan, { completed: !plan.completed })} className="water-btn-outline rounded-lg px-3 py-2 text-xs font-semibold">{plan.completed ? 'إعادة فتح' : 'تحديد كمكتملة'}</button>
        <button type="button" disabled={busy} onClick={() => onStatus(plan, { archived: !plan.archived })} className="water-btn-outline rounded-lg px-3 py-2 text-xs font-semibold">{plan.archived ? 'استعادة' : 'أرشفة'}</button>
        <button type="button" disabled={busy} onClick={() => onDelete(plan)} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">حذف</button>
      </div>
    </article>)}</div>
  </section>
}

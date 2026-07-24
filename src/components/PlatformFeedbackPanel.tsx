'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { api } from '@/lib/api'
import type { FeedbackReport, FeedbackStatus } from '@/lib/types'

const STATUS_META: Record<FeedbackStatus, { label: string; className: string }> = {
  open: { label: 'جديد', className: 'bg-red-100 text-red-700 dark:bg-red-900/35 dark:text-red-200' },
  in_review: { label: 'قيد المراجعة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-200' },
  resolved: { label: 'تم الحل', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200' },
  not_an_issue: { label: 'ليست مشكلة', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
}

const CATEGORY_LABEL = {
  bug: 'مشكلة تقنية',
  suggestion: 'اقتراح',
  other: 'ملاحظة',
}

export default function PlatformFeedbackPanel() {
  const [items, setItems] = useState<FeedbackReport[]>([])
  const [filter, setFilter] = useState<'all' | FeedbackStatus>('open')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<FeedbackReport | null>(null)
  const [nextStatus, setNextStatus] = useState<FeedbackStatus>('in_review')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await api.getPlatformFeedback(filter === 'all' ? undefined : filter, query.trim() || undefined))
    } catch (reason: any) {
      setError(reason.message || 'تعذر تحميل بلاغات المستخدمين')
    } finally {
      setLoading(false)
    }
  }, [filter, query])

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), query ? 300 : 0)
    return () => window.clearTimeout(timeout)
  }, [load, query])

  const counts = useMemo(() => ({
    visible: items.length,
  }), [items])

  const review = (item: FeedbackReport) => {
    setSelected(item)
    setNextStatus(item.status === 'open' ? 'in_review' : item.status)
    setNote(item.resolution_note || '')
  }

  const save = async () => {
    if (!selected) return
    setBusyId(selected.id)
    setError('')
    try {
      await api.updatePlatformFeedback(selected.id, nextStatus, note)
      setSelected(null)
      await load()
    } catch (reason: any) {
      setError(reason.message || 'تعذر تحديث حالة البلاغ')
    } finally {
      setBusyId(null)
    }
  }

  const filters: Array<{ key: 'all' | FeedbackStatus; label: string }> = [
    { key: 'open', label: 'الجديدة' },
    { key: 'in_review', label: 'قيد المراجعة' },
    { key: 'resolved', label: 'تم حلها' },
    { key: 'not_an_issue', label: 'ليست مشكلة' },
    { key: 'all', label: 'الكل' },
  ]

  return (
    <section className="glass-card rounded-2xl p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-deep-900">بلاغات وملاحظات المستخدمين</h2>
            {filter === 'open' && counts.visible > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{counts.visible}</span>}
          </div>
          <p className="mt-1 text-xs text-deep-500">راجع المشكلات والاقتراحات وحدّث حالتها مع توضيح الإجراء.</p>
        </div>
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="بحث في البلاغات..."
          className="surface-field w-full rounded-xl px-4 py-2.5 text-sm lg:w-72"
        />
      </div>

      <div className="mobile-scroll-tabs mt-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map(option => (
          <button
            key={option.key}
            onClick={() => setFilter(option.key)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold ${filter === option.key ? 'water-btn text-white' : 'water-btn-outline'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/25 dark:text-red-200">{error}</p>}
      {loading ? (
        <p className="py-8 text-center text-sm text-deep-500">جاري تحميل البلاغات...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-deep-500">لا توجد بلاغات ضمن هذه التصفية.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map(item => (
            <article key={item.id} className="rounded-2xl border border-water-200/70 bg-white/55 p-4 dark:bg-slate-900/35">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_META[item.status].className}`}>{STATUS_META[item.status].label}</span>
                    <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-bold text-cyan-800 dark:bg-cyan-900/35 dark:text-cyan-200">{CATEGORY_LABEL[item.category]}</span>
                  </div>
                  <h3 className="mt-3 font-bold text-deep-900">{item.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-deep-700">{item.description}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-deep-500">
                    <span>المستخدم: <b>{item.reporter_username}</b></span>
                    <span>التحفيظ: <b>{item.tahfiz_name || 'غير محدد'}</b></span>
                    <span>{new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}</span>
                    {item.page_url && <span dir="ltr">الصفحة: {item.page_url}</span>}
                  </div>
                  {item.resolution_note && (
                    <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      ملاحظة المراجعة: {item.resolution_note}
                    </p>
                  )}
                </div>
                <button onClick={() => review(item)} className="water-btn-outline shrink-0 rounded-xl px-4 py-2 text-sm font-bold">
                  مراجعة البلاغ
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={() => setSelected(null)}>
          <div role="dialog" aria-modal="true" className="mobile-sheet glass-strong w-full rounded-t-3xl p-5 sm:max-w-lg sm:rounded-2xl sm:p-6" onClick={event => event.stopPropagation()}>
            <h3 className="text-xl font-bold text-deep-900">مراجعة البلاغ</h3>
            <p className="mt-1 text-sm font-semibold text-deep-700">{selected.title}</p>
            <label className="mt-5 block text-sm font-semibold text-deep-700">
              الحالة
              <select value={nextStatus} onChange={event => setNextStatus(event.target.value as FeedbackStatus)} className="surface-field mt-2 w-full rounded-xl px-4 py-3">
                {Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold text-deep-700">
              ملاحظة المراجعة
              <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={4} className="surface-field mt-2 w-full resize-none rounded-xl px-4 py-3" placeholder="ما الإجراء الذي تم أو لماذا لا يُعد هذا بلاغاً؟" />
            </label>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setSelected(null)} className="water-btn-outline flex-1 rounded-xl px-4 py-3">إلغاء</button>
              <button disabled={busyId === selected.id} onClick={() => void save()} className="water-btn flex-1 rounded-xl px-4 py-3 font-bold text-white disabled:opacity-50">
                {busyId === selected.id ? 'جاري الحفظ...' : 'حفظ الحالة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

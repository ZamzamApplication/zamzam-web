'use client'

import { usePathname } from 'next/navigation'
import { FormEvent, useEffect, useRef, useState } from 'react'

import { api } from '@/lib/api'
import type { FeedbackCategory } from '@/lib/types'

export default function FeedbackButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) titleRef.current?.focus()
  }, [open])

  const close = () => {
    if (busy) return
    setOpen(false)
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (title.trim().length < 5 || description.trim().length < 10) return
    setBusy(true)
    setError('')
    try {
      await api.createFeedback({
        category,
        title: title.trim(),
        description: description.trim(),
        page_url: pathname,
      })
      setTitle('')
      setDescription('')
      setCategory('bug')
      setSent(true)
      setOpen(false)
      window.setTimeout(() => setSent(false), 4000)
    } catch (reason: any) {
      setError(reason.message || 'تعذر إرسال البلاغ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-30 inline-flex min-h-11 items-center gap-2 rounded-full bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 md:bottom-6 md:left-6"
        aria-label="إرسال ملاحظة أو الإبلاغ عن مشكلة"
      >
        <span aria-hidden="true">✦</span>
        <span>ملاحظة</span>
      </button>

      {sent && (
        <div role="status" className="fixed bottom-24 left-4 z-40 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-lg md:bottom-20 md:left-6">
          تم إرسال ملاحظتك، شكراً لك.
        </div>
      )}

      {open && (
        <div
          className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={close}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            onSubmit={submit}
            onClick={event => event.stopPropagation()}
            className="mobile-sheet glass-strong max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl p-5 sm:max-w-lg sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-title" className="text-xl font-bold text-deep-900">شاركنا ملاحظتك</h2>
                <p className="mt-1 text-sm text-deep-500">أبلغ عن مشكلة أو اقترح تحسيناً للمنصة.</p>
              </div>
              <button type="button" onClick={close} className="nav-icon-btn shrink-0" aria-label="إغلاق">×</button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-deep-700">
              نوع الملاحظة
              <select
                value={category}
                onChange={event => setCategory(event.target.value as FeedbackCategory)}
                className="surface-field mt-2 w-full rounded-xl px-4 py-3"
              >
                <option value="bug">مشكلة تقنية</option>
                <option value="suggestion">اقتراح تحسين</option>
                <option value="other">ملاحظة أخرى</option>
              </select>
            </label>

            <label className="mt-4 block text-sm font-semibold text-deep-700">
              عنوان مختصر
              <input
                ref={titleRef}
                value={title}
                onChange={event => setTitle(event.target.value)}
                maxLength={120}
                placeholder="مثال: لا تظهر قائمة الطلاب"
                className="surface-field mt-2 w-full rounded-xl px-4 py-3"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold text-deep-700">
              التفاصيل
              <textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                maxLength={4000}
                rows={5}
                placeholder="اشرح ما حدث والخطوات التي أدت إليه..."
                className="surface-field mt-2 w-full resize-none rounded-xl px-4 py-3"
              />
            </label>

            <p className="mt-2 text-xs text-deep-500">سيُرفق مسار الصفحة الحالية تلقائياً لمساعدتنا في المراجعة.</p>
            {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/25 dark:text-red-200">{error}</p>}

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={close} className="water-btn-outline flex-1 rounded-xl px-4 py-3">إلغاء</button>
              <button
                type="submit"
                disabled={busy || title.trim().length < 5 || description.trim().length < 10}
                className="water-btn flex-1 rounded-xl px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                {busy ? 'جاري الإرسال...' : 'إرسال'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

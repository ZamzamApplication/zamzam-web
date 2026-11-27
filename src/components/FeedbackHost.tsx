'use client'

import { useEffect, useState } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'
import Icon from '@/components/Icon'
import { dismissToast, subscribeFeedback, type ConfirmRequest, type ToastItem, type ToastTone } from '@/lib/ui-feedback'

const TONE_STYLES: Record<ToastTone, { box: string; icon: string; glyph: 'check' | 'alert' | 'info' }> = {
  success: { box: 'border-emerald-300 dark:border-emerald-700', icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200', glyph: 'check' },
  error: { box: 'border-red-300 dark:border-red-800', icon: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200', glyph: 'alert' },
  warning: { box: 'border-amber-300 dark:border-amber-700', icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200', glyph: 'alert' },
  info: { box: 'border-water-300 dark:border-slate-600', icon: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200', glyph: 'info' },
}

function ToastCard({ item }: { item: ToastItem }) {
  useEffect(() => {
    if (!item.duration) return
    const timer = window.setTimeout(() => dismissToast(item.id), item.duration)
    return () => window.clearTimeout(timer)
  }, [item.duration, item.id])

  const tone = TONE_STYLES[item.tone]
  const body = (
    <>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone.icon}`}><Icon name={tone.glyph} className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1 text-right">
        {item.title && <span className="block font-bold text-deep-900">{item.title}</span>}
        <span className={`block text-sm leading-6 ${item.title ? 'text-deep-500' : 'font-semibold text-deep-800'}`}>{item.message}</span>
        {item.actionLabel && <span className="mt-1 block text-xs font-bold text-blue-700 underline dark:text-blue-300">{item.actionLabel}</span>}
      </span>
    </>
  )

  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      className={`toast-enter glass-strong pointer-events-auto flex items-start gap-2 rounded-2xl border p-3 shadow-2xl ${tone.box}`}
    >
      {item.onAction ? (
        <button type="button" className="flex min-w-0 flex-1 items-start gap-3" onClick={() => { item.onAction?.(); dismissToast(item.id) }}>{body}</button>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
      )}
      <button type="button" onClick={() => dismissToast(item.id)} aria-label="إغلاق التنبيه" className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-deep-400 hover:bg-water-100/60 hover:text-deep-700">
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function FeedbackHost() {
  const [confirms, setConfirms] = useState<ConfirmRequest[]>([])
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => subscribeFeedback(next => {
    setConfirms(next.confirms)
    setToasts(next.toasts)
  }), [])

  const activeConfirm = confirms[0]

  return (
    <>
      <div className="toast-region pointer-events-none fixed inset-x-3 z-[100] mx-auto grid max-w-sm gap-2 sm:inset-x-auto sm:left-6" aria-live="polite">
        {toasts.map(item => <ToastCard key={item.id} item={item} />)}
      </div>
      {activeConfirm && (
        <ConfirmDialog
          key={activeConfirm.id}
          open
          title={activeConfirm.title}
          message={activeConfirm.message}
          confirmLabel={activeConfirm.confirmLabel}
          cancelLabel={activeConfirm.cancelLabel}
          tone={activeConfirm.tone}
          onConfirm={() => activeConfirm.resolve(true)}
          onClose={() => activeConfirm.resolve(false)}
        />
      )}
    </>
  )
}

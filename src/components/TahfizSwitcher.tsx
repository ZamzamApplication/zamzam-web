'use client'

import { useEffect, useRef, useState } from 'react'
import type { User } from '@/lib/types'
import Icon from '@/components/Icon'

export default function TahfizSwitcher({
  user,
  onSwitch,
  onCreate,
  switchingId,
}: {
  user: User
  onSwitch: (tahfizId: number) => void
  onCreate: () => void
  switchingId: number | null
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const memberships = user.memberships || []
  const current = memberships.find(membership => membership.tahfiz_id === user.tahfiz_id)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (!current) return null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`group flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5 text-right transition sm:px-2.5 ${
          open
            ? 'border-cyan-400 bg-cyan-50 shadow-md shadow-cyan-900/10 dark:border-cyan-600 dark:bg-cyan-950/70'
            : 'border-water-200/80 bg-white/55 hover:border-cyan-300 hover:bg-white/80 dark:border-slate-700 dark:bg-slate-900/45 dark:hover:border-cyan-700'
        }`}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-sm text-white shadow-sm">
          {current.tahfiz_name.trim().charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="hidden text-xs font-semibold leading-none text-deep-400 sm:block">التحفيظ الحالي</span>
          <span className="block max-w-24 truncate text-xs font-bold text-deep-800 sm:mt-1 sm:max-w-40 sm:text-sm">{current.tahfiz_name}</span>
        </span>
        <Icon name="chevron-down" className={`h-4 w-4 shrink-0 text-deep-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute end-0 top-full z-[70] mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-water-200 bg-white/95 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
          <div className="px-3 pb-2 pt-1">
            <p className="text-sm font-bold text-deep-900">التبديل بين التحفيظات</p>
            <p className="mt-0.5 text-xs text-deep-500">ستتغير البيانات والحلقات حسب التحفيظ المختار</p>
          </div>
          <div className="space-y-1" role="none">
            {memberships.map(membership => {
              const isCurrent = membership.tahfiz_id === user.tahfiz_id
              const isAvailable = membership.tahfiz_status === 'active'
              return (
                <button
                  key={membership.id}
                  type="button"
                  role="menuitem"
                  disabled={!isAvailable || switchingId !== null}
                  onClick={() => {
                    setOpen(false)
                    onSwitch(membership.tahfiz_id)
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    isCurrent
                      ? 'bg-cyan-50 ring-1 ring-inset ring-cyan-200 dark:bg-cyan-950/50 dark:ring-cyan-800'
                      : 'hover:bg-water-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                    isCurrent ? 'bg-cyan-600 text-white' : 'bg-water-100 text-blue-700 dark:bg-slate-800 dark:text-blue-300'
                  }`}>
                    {membership.tahfiz_name.trim().charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-deep-900">{membership.tahfiz_name}</span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        membership.role === 'admin'
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                      }`}>
                        {membership.role === 'admin' ? 'مدير' : 'شيخ'}
                      </span>
                      {!isAvailable && <span className="text-xs text-red-500">غير نشط</span>}
                    </span>
                  </span>
                  {switchingId === membership.tahfiz_id ? (
                    <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-600" aria-label="جاري التبديل" />
                  ) : isCurrent && (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-600 text-xs font-bold text-white" aria-label="التحفيظ الحالي"><Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} /></span>
                  )}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onCreate()
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-300 px-3 py-2.5 text-sm font-bold text-blue-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-blue-300 dark:hover:bg-cyan-950/40"
          >
            <Icon name="plus" className="h-4 w-4" /> إنشاء تحفيظ جديد
          </button>
        </div>
      )}
    </div>
  )
}

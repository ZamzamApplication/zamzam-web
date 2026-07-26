'use client'

import { useEffect, useRef, useState } from 'react'

const COLOR_STYLES: Record<string, string> = {
  green: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  slate: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
  amber: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200',
  sky: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200',
  violet: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200',
  rose: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200',
}

export function attendanceStatusColorClass(colorKey?: string) {
  return COLOR_STYLES[colorKey || 'violet'] || COLOR_STYLES.violet
}

export default function AttendanceStatusControl({
  value,
  statuses,
  disabled,
  saving,
  colorKey = 'violet',
  onChange,
}: {
  value: string
  statuses: string[]
  disabled?: boolean
  saving?: boolean
  colorKey?: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const options = statuses.includes(value) ? statuses : [value, ...statuses]

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const cycle = () => {
    if (disabled || options.length === 0) return
    const currentIndex = options.indexOf(value)
    onChange(options[(currentIndex + 1 + options.length) % options.length])
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className={`grid min-h-10 grid-cols-[minmax(0,1fr)_2.5rem] overflow-hidden rounded-xl border shadow-sm transition ${attendanceStatusColorClass(colorKey)} ${saving ? 'opacity-60' : ''}`}>
        <button
          type="button"
          disabled={disabled}
          onClick={cycle}
          className="min-w-0 truncate border-l border-current/20 px-2 py-2 text-sm font-bold hover:bg-white/30 disabled:cursor-not-allowed"
          aria-label={`الحالة الحالية ${value}، اضغط للانتقال إلى الحالة التالية`}
        >
          {value}{saving ? '…' : ''}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(current => !current)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="فتح قائمة حالات الحضور"
          className="grid place-items-center hover:bg-white/30 disabled:cursor-not-allowed"
        >
          <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m5.25 7.5 4.75 4.75 4.75-4.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {open && (
        <div role="menu" className="absolute inset-x-0 top-full z-40 mt-1.5 min-w-40 rounded-xl border border-water-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {options.map(status => (
            <button
              key={status}
              type="button"
              role="menuitemradio"
              aria-checked={status === value}
              onClick={() => {
                setOpen(false)
                if (status !== value) onChange(status)
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-xs hover:bg-water-50 dark:hover:bg-slate-800 ${status === value ? 'font-bold text-cyan-700 dark:text-cyan-300' : 'text-deep-800'}`}
            >
              <span>{status}</span>
              <span aria-hidden="true">{status === value ? '✓' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

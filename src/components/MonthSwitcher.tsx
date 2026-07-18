'use client'

import { formatMonth, shiftMonth } from '@/lib/month'

export default function MonthSwitcher({
  value,
  onChange,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, -1))}
        disabled={disabled}
        className="water-btn-outline rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        الشهر السابق
      </button>
      <div className="text-center">
        <div className="text-sm font-semibold text-deep-800">{formatMonth(value)}</div>
        <input
          type="month"
          value={value}
          onChange={(event) => event.target.value && onChange(event.target.value)}
          disabled={disabled}
          aria-label="اختر الشهر"
          className="surface-field mt-1 rounded-lg px-3 py-1.5 text-xs"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, 1))}
        disabled={disabled}
        className="water-btn-outline rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        الشهر التالي
      </button>
    </div>
  )
}

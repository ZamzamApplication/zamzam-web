'use client'

import { financialMonthValue, formatMonth, shiftMonth } from '@/lib/month'

export default function MonthSwitcher({
  value,
  onChange,
  disabled = false,
  label,
  monthStartDay = 1,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  label?: string
  monthStartDay?: number
}) {
  const months = Array.from({ length: 25 }, (_, index) => shiftMonth(value, index - 12))

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
        <div className="text-sm font-semibold text-deep-800">{label || formatMonth(financialMonthValue(value, monthStartDay))}</div>
        <select
          value={value}
          onChange={(event) => event.target.value && onChange(event.target.value)}
          disabled={disabled}
          aria-label="اختر الشهر"
          className="surface-field mt-1 rounded-lg px-3 py-1.5 text-xs"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {formatMonth(financialMonthValue(month, monthStartDay))}
            </option>
          ))}
        </select>
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

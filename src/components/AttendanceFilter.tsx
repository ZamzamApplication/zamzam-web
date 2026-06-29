'use client'

import { useState } from 'react'
import type { AttendanceGridSession, FilterRule } from '@/lib/types'

const STATUS_OPTIONS = ['حاضر', 'غياب', 'غياب بعذر', 'لا ينطبق']
const OPERATORS = [
  { value: 'is', label: 'يساوي' },
  { value: 'is_not', label: 'لا يساوي' },
]

interface Props {
  sessions: AttendanceGridSession[]
  initialRules: FilterRule[]
  onApply: (rules: FilterRule[]) => void
  onCancel: () => void
}

export default function AttendanceFilter({ sessions, initialRules, onApply, onCancel }: Props) {
  const [rules, setRules] = useState<FilterRule[]>(
    initialRules.length > 0
      ? initialRules
      : [{ sessionId: sessions[0]?.id || 0, operator: 'is', status: 'حاضر' }]
  )

  const updateRule = (index: number, field: keyof FilterRule, value: number | string) => {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { sessionId: sessions[0]?.id || 0, operator: 'is', status: 'حاضر', connector: 'and' },
    ])
  }

  return (
    <div className="glass-strong rounded-2xl p-4 space-y-2.5 border border-water-300/50">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-deep-800">بناء التصفية</h3>
        <button onClick={onCancel} className="text-deep-400 hover:text-deep-600 transition text-lg leading-none">&times;</button>
      </div>

      {rules.map((rule, i) => (
        <div key={i}>
          {i > 0 && (
            <div className="flex justify-center mb-1.5">
              <div className="flex bg-white/60 dark:bg-slate-800/60 rounded-md p-0.5 border border-water-200/50">
                <button
                  onClick={() => updateRule(i, 'connector', 'and')}
                  className={`px-2.5 py-0.5 text-[11px] rounded transition font-medium ${
                    rule.connector === 'and' ? 'bg-water-400/30 text-deep-800' : 'text-deep-500 hover:text-deep-700'
                  }`}
                >
                  AND
                </button>
                <button
                  onClick={() => updateRule(i, 'connector', 'or')}
                  className={`px-2.5 py-0.5 text-[11px] rounded transition font-medium ${
                    rule.connector === 'or' ? 'bg-water-400/30 text-deep-800' : 'text-deep-500 hover:text-deep-700'
                  }`}
                >
                  OR
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <select
              value={rule.sessionId}
              onChange={(e) => updateRule(i, 'sessionId', Number(e.target.value))}
              className="flex-1 min-w-0 px-2.5 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-water-400"
            >
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.date}</option>)}
            </select>
            <select
              value={rule.operator}
              onChange={(e) => updateRule(i, 'operator', e.target.value)}
              className="w-20 shrink-0 px-2 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-water-400"
            >
              {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
            <select
              value={rule.status}
              onChange={(e) => updateRule(i, 'status', e.target.value)}
              className="w-[72px] shrink-0 px-2 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-water-400"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => removeRule(i)}
              className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/30 transition text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <button
          onClick={addRule}
          className="flex-1 py-1.5 water-btn-outline rounded-lg text-xs font-medium"
        >
          + إضافة قاعدة
        </button>
        <button
          onClick={() => onApply(rules)}
          className="flex-1 py-1.5 water-btn text-white rounded-lg text-xs font-medium"
        >
          تطبيق
        </button>
      </div>
    </div>
  )
}

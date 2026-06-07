'use client'

import { useState } from 'react'
import type { Circle, FilterRule } from '@/lib/types'

const STATUS_OPTIONS = ['حاضر', 'غياب', 'غياب بعذر']
const OPERATORS = [
  { value: 'is', label: 'يساوي' },
  { value: 'is_not', label: 'لا يساوي' },
]

interface Props {
  circles: Circle[]
  initialRules: FilterRule[]
  initialLogic: 'and' | 'or'
  onApply: (rules: FilterRule[], logic: 'and' | 'or') => void
  onCancel: () => void
}

export default function AttendanceFilter({ circles, initialRules, initialLogic, onApply, onCancel }: Props) {
  const [rules, setRules] = useState<FilterRule[]>(initialRules.length > 0 ? initialRules : [{
    circleId: circles[0]?.id || 0,
    operator: 'is',
    status: 'حاضر',
  }])
  const [logic, setLogic] = useState<'and' | 'or'>(initialLogic)

  const updateRule = (index: number, field: keyof FilterRule, value: number | string) => {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }

  const addRule = () => {
    setRules((prev) => [...prev, { circleId: circles[0]?.id || 0, operator: 'is', status: 'حاضر' }])
  }

  const hasActive = rules.length > 0 && rules.some((r) => r.circleId)

  return (
    <div className="glass-strong rounded-2xl p-5 space-y-4 border border-water-300/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-deep-800">بناء التصفية</h3>
        <button onClick={onCancel} className="text-deep-400 hover:text-deep-600 transition text-lg leading-none">&times;</button>
      </div>

      {rules.length === 0 && (
        <p className="text-sm text-deep-500 text-center py-4">لا توجد قواعد. أضف قاعدة للبدء.</p>
      )}

      {rules.map((rule, i) => (
        <div key={i}>
          {i > 0 && (
            <div className="flex justify-center mb-3">
              <div className="flex bg-white/60 rounded-lg p-0.5 border border-water-200/50">
                <button
                  onClick={() => setLogic('and')}
                  className={`px-3 py-1 text-xs rounded-md transition font-medium ${
                    logic === 'and' ? 'bg-water-400/30 text-deep-800' : 'text-deep-500 hover:text-deep-700'
                  }`}
                >
                  الكل (AND)
                </button>
                <button
                  onClick={() => setLogic('or')}
                  className={`px-3 py-1 text-xs rounded-md transition font-medium ${
                    logic === 'or' ? 'bg-water-400/30 text-deep-800' : 'text-deep-500 hover:text-deep-700'
                  }`}
                >
                  أي (OR)
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <select
              value={rule.circleId}
              onChange={(e) => updateRule(i, 'circleId', Number(e.target.value))}
              className="flex-1 px-3 py-2 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-water-400"
            >
              {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={rule.operator}
              onChange={(e) => updateRule(i, 'operator', e.target.value)}
              className="w-28 px-3 py-2 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-water-400"
            >
              {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
            <select
              value={rule.status}
              onChange={(e) => updateRule(i, 'status', e.target.value)}
              className="w-28 px-3 py-2 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-water-400"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => removeRule(i)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50/50 transition text-lg shrink-0"
            >
              &times;
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addRule}
        className="w-full py-2 water-btn-outline rounded-xl text-sm font-medium"
      >
        + إضافة قاعدة
      </button>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">
          إلغاء
        </button>
        <button
          onClick={() => onApply(rules, logic)}
          className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium"
        >
          تطبيق
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { AttendanceGridSession, FilterRule, FilterGroup } from '@/lib/types'

const WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function formatDateWithWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const wd = (d.getDay() + 1) % 7
  return `${WEEKDAY_NAMES[wd]} ${dateStr}`
}

const STATUS_OPTIONS = ['حاضر', 'غياب', 'غياب بعذر', 'لا ينطبق']
const OPERATORS = [
  { value: 'is', label: 'يساوي' },
  { value: 'is_not', label: 'لا يساوي' },
]

let groupCounter = 0
let ruleCounter = 0

function makeRule(sessionId: number, connector?: 'and' | 'or'): FilterRule {
  return { sessionId, operator: 'is', status: 'حاضر', connector }
}

function makeGroup(sessionId: number): FilterGroup {
  return { id: `g${++groupCounter}`, rules: [makeRule(sessionId)] }
}

interface Props {
  sessions: AttendanceGridSession[]
  initialGroups: FilterGroup[]
  onApply: (groups: FilterGroup[]) => void
  onCancel: () => void
}

export default function AttendanceFilter({ sessions, initialGroups, onApply, onCancel }: Props) {
  const [groups, setGroups] = useState<FilterGroup[]>(
    initialGroups.length > 0
      ? initialGroups
      : [makeGroup(sessions[0]?.id || 0)]
  )

  const updateGroupConnector = (gi: number, connector: 'and' | 'or') => {
    setGroups((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, connector } : g))
    )
  }

  const updateRule = (gi: number, ri: number, field: keyof FilterRule, value: number | string) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? {
              ...g,
              rules: g.rules.map((r, j) => (j === ri ? { ...r, [field]: value } : r)),
            }
          : g
      )
    )
  }

  const removeRule = (gi: number, ri: number) => {
    setGroups((prev) =>
      prev
        .map((g, i) =>
          i === gi ? { ...g, rules: g.rules.filter((_, j) => j !== ri) } : g
        )
        .filter((g) => g.rules.length > 0)
    )
  }

  const addRule = (gi: number) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? {
              ...g,
              rules: [
                ...g.rules,
                makeRule(sessions[0]?.id || 0, 'and'),
              ],
            }
          : g
      )
    )
  }

  const addGroup = () => {
    setGroups((prev) => [
      ...prev,
      { ...makeGroup(sessions[0]?.id || 0), connector: 'and' },
    ])
  }

  const removeGroup = (gi: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== gi))
  }

  return (
    <div className="glass-strong rounded-2xl p-4 space-y-3 border border-water-300/50">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-deep-800">بناء التصفية</h3>
        <button onClick={onCancel} className="text-deep-400 hover:text-deep-600 transition text-lg leading-none">&times;</button>
      </div>

      {groups.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex bg-white/60 dark:bg-slate-800/60 rounded-md p-0.5 border border-water-200/50">
                <button
                  onClick={() => updateGroupConnector(gi, 'and')}
                  className={`px-2 py-0.5 text-[11px] rounded transition font-medium ${
                    group.connector === 'and' ? 'bg-water-400/30 text-deep-800' : 'text-deep-500 hover:text-deep-700'
                  }`}
                >
                  AND
                </button>
                <button
                  onClick={() => updateGroupConnector(gi, 'or')}
                  className={`px-2 py-0.5 text-[11px] rounded transition font-medium ${
                    group.connector === 'or' ? 'bg-water-400/30 text-deep-800' : 'text-deep-500 hover:text-deep-700'
                  }`}
                >
                  OR
                </button>
              </div>
              <div className="h-px flex-1 bg-water-200/40" />
            </div>
          )}

          <div className="border-r-2 border-water-300/40 pr-3 space-y-1.5">
            {group.rules.map((rule, ri) => (
              <div key={ri} className="flex items-center gap-1.5">
                {ri > 0 && (
                  <div className="flex bg-white/60 dark:bg-slate-800/60 rounded-md p-0.5 border border-water-200/50 shrink-0">
                    <button
                      onClick={() => updateRule(gi, ri, 'connector', 'and')}
                      className={`px-2 py-0.5 text-[11px] rounded transition font-medium ${
                        rule.connector === 'and' ? 'bg-water-400/30 text-deep-800' : 'text-deep-500 hover:text-deep-700'
                      }`}
                    >
                      AND
                    </button>
                    <button
                      onClick={() => updateRule(gi, ri, 'connector', 'or')}
                      className={`px-2 py-0.5 text-[11px] rounded transition font-medium ${
                        rule.connector === 'or' ? 'bg-water-400/30 text-deep-800' : 'text-deep-500 hover:text-deep-700'
                      }`}
                    >
                      OR
                    </button>
                  </div>
                )}
                <select
                  value={rule.sessionId}
                  onChange={(e) => updateRule(gi, ri, 'sessionId', Number(e.target.value))}
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-water-400"
                >
                  {sessions.map((s) => <option key={s.id} value={s.id}>{formatDateWithWeekday(s.date)}</option>)}
                </select>
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(gi, ri, 'operator', e.target.value)}
                  className="w-20 shrink-0 px-2 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-water-400"
                >
                  {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                <select
                  value={rule.status}
                  onChange={(e) => updateRule(gi, ri, 'status', e.target.value)}
                  className="w-[72px] shrink-0 px-2 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-water-400"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={() => removeRule(gi, ri)}
                  className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/30 transition text-sm"
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={() => addRule(gi)}
              className="w-full py-1 text-xs text-deep-500 hover:text-deep-700 border border-dashed border-water-300/50 rounded-lg hover:bg-water-100/20 transition"
            >
              + إضافة قاعدة
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <button
          onClick={addGroup}
          className="flex-1 py-1.5 water-btn-outline rounded-lg text-xs font-medium"
        >
          + إضافة مجموعة
        </button>
        <button
          onClick={() => onApply(groups)}
          className="flex-1 py-1.5 water-btn text-white rounded-lg text-xs font-medium"
        >
          تطبيق
        </button>
      </div>
    </div>
  )
}

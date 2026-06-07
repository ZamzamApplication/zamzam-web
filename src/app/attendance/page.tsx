'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import type { SheikhInfo, Circle, AttendanceGrid, FilterRule } from '@/lib/types'
import AttendanceFilter from '@/components/AttendanceFilter'

const STATUS_COLORS: Record<string, string> = {
  'حاضر': 'bg-green-200/60 text-green-800',
  'غياب': 'bg-gray-200/50 text-gray-600',
  'غياب بعذر': 'bg-yellow-200/60 text-yellow-800',
}

function matchesRule(student: { records: Record<string, string> }, sessions: AttendanceGrid['sessions'], rule: FilterRule): boolean {
  const circleSessionIds = sessions.filter((s) => s.circle_id === rule.circleId).map((s) => String(s.id))
  const hasMatch = circleSessionIds.some((sid) => {
    const status = student.records[sid] || 'غياب'
    return status === rule.status
  })
  return rule.operator === 'is' ? hasMatch : !hasMatch
}

function filterByRules(students: AttendanceGrid['students'], sessions: AttendanceGrid['sessions'], rules: FilterRule[], logic: 'and' | 'or'): AttendanceGrid['students'] {
  if (rules.length === 0) return students
  return students.filter((st) => {
    if (logic === 'and') return rules.every((r) => matchesRule(st, sessions, r))
    return rules.some((r) => matchesRule(st, sessions, r))
  })
}

export default function AttendancePage() {
  const [sheikhs, setSheikhs] = useState<SheikhInfo[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [selectedSheikh, setSelectedSheikh] = useState<number | ''>('')
  const [grid, setGrid] = useState<AttendanceGrid | null>(null)
  const [loading, setLoading] = useState(false)

  const [showFilter, setShowFilter] = useState(false)
  const [filterRules, setFilterRules] = useState<FilterRule[]>([])
  const [filterLogic, setFilterLogic] = useState<'and' | 'or'>('and')
  const [searchQuery, setSearchQuery] = useState('')

  const loadGrid = useCallback(async (sheikhId: number | '') => {
    setLoading(true)
    try {
      const data = await api.getAttendanceGrid(sheikhId || undefined)
      setGrid(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.all([api.getSheikhs(), api.getCircles()])
      .then(([s, c]) => { setSheikhs(s); setCircles(c) })
      .catch(console.error)
    loadGrid('')
  }, [loadGrid])

  useEffect(() => {
    loadGrid(selectedSheikh)
  }, [selectedSheikh, loadGrid])

  const hasActiveFilter = filterRules.length > 0

  const filteredSessions = useMemo(() => {
    if (!grid || !hasActiveFilter) return grid?.sessions || []
    const ruleCircleIds = new Set(filterRules.map((r) => r.circleId))
    return grid.sessions.filter((s) => ruleCircleIds.has(s.circle_id))
  }, [grid, filterRules, hasActiveFilter])

  const ruleFilteredStudents = useMemo(() => {
    if (!grid) return []
    const baseStudents = filterByRules(grid.students, grid.sessions, filterRules, filterLogic)
    return baseStudents
  }, [grid, filterRules, filterLogic])

  const searchedStudents = useMemo(() => {
    if (!searchQuery.trim()) return ruleFilteredStudents
    const q = searchQuery.trim().toLowerCase()
    return ruleFilteredStudents.filter((st) => st.name.toLowerCase().includes(q))
  }, [ruleFilteredStudents, searchQuery])

  const displaySessions = hasActiveFilter ? filteredSessions : grid?.sessions || []
  const displayStudents = searchedStudents

  const handleApplyFilter = (rules: FilterRule[], logic: 'and' | 'or') => {
    setFilterRules(rules)
    setFilterLogic(logic)
    setShowFilter(false)
  }

  const clearFilter = () => {
    setFilterRules([])
    setFilterLogic('and')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-deep-800">سجل الحضور</h1>
      </div>

      <div className="glass-card rounded-2xl p-5 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-deep-700 mb-2">اختر الشيخ</label>
          <select
            value={selectedSheikh}
            onChange={(e) => setSelectedSheikh(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
          >
            <option value="">كل الشيوخ</option>
            {sheikhs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              hasActiveFilter
                ? 'bg-cyan-600 text-white shadow-md'
                : 'water-btn-outline'
            }`}
          >
            {hasActiveFilter ? '🔍 تصفية مفعلة' : '🔍 تصفية'}
          </button>
          {hasActiveFilter && (
            <button
              onClick={clearFilter}
              className="px-3 py-2 rounded-xl text-sm border border-red-200 text-red-600 hover:bg-red-50/50 transition"
            >
              إلغاء التصفية
            </button>
          )}
        </div>

        {showFilter && (
          <AttendanceFilter
            circles={circles}
            initialRules={filterRules}
            initialLogic={filterLogic}
            onApply={handleApplyFilter}
            onCancel={() => setShowFilter(false)}
          />
        )}

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث عن طالب..."
          className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 text-sm"
        />
      </div>

      {loading && (
        <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">جاري التحميل...</div>
      )}

      {grid && displaySessions.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
          {hasActiveFilter ? 'لا توجد جلسات تطابق التصفية' : 'لا توجد جلسات مؤكدة بعد'}
        </div>
      )}

      {grid && displaySessions.length > 0 && (
        <div className="glass-card rounded-2xl p-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-water-200/30">
                <th className="text-right py-3 px-3 text-deep-700 sticky right-0 bg-white/60 backdrop-blur-sm z-10 min-w-[120px]">الطالب</th>
                {displaySessions.map((s) => (
                  <th key={s.id} className="text-center py-3 px-2 text-deep-600 text-xs whitespace-nowrap min-w-[70px]">{s.date}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayStudents.map((student) => (
                <tr key={student.id} className="border-b border-water-200/20 hover:bg-water-100/20">
                  <td className="py-2.5 px-3 text-deep-800 font-medium sticky right-0 bg-white/40 backdrop-blur-sm z-10">{student.name}</td>
                  {displaySessions.map((s) => {
                    const status = student.records[String(s.id)] || 'غياب'
                    return (
                      <td key={s.id} className="text-center py-2 px-2">
                        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[status] || STATUS_COLORS['غياب']}`}>
                          {status}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-center text-sm text-deep-500">
            عدد الطلاب: {displayStudents.length} من {grid.students.length}
          </div>
        </div>
      )}
    </div>
  )
}

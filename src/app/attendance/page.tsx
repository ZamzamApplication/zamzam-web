'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { formatDateWithWeekday } from '@/lib/format'
import type { User, SheikhInfo, AttendanceGrid, AttendanceGridSession, AttendanceGridStudent, FilterRule, FilterGroup } from '@/lib/types'
import AttendanceFilter from '@/components/AttendanceFilter'

interface SavedFilter {
  id: number
  name: string
  groups: FilterGroup[]
}

const STATUS_COLORS: Record<string, string> = {
  'حاضر': 'bg-green-200/60 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'غياب': 'bg-gray-200/50 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400',
  'غياب بعذر': 'bg-yellow-200/60 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'لا ينطبق': 'bg-blue-200/60 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
}

function getSessionWeekday(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getDay()
}

function hasWeekdayRules(groups: FilterGroup[]): boolean {
  return groups.some((g) => g.rules.some((r) => r.target === 'weekday'))
}

function getSessionRuleIds(groups: FilterGroup[]): number[] {
  return groups.flatMap((g) =>
    g.rules
      .filter((r) => (r.target || 'session') === 'session')
      .map((r) => r.sessionId)
  )
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function statusMatches(status: string, rule: FilterRule): boolean {
  const hasMatch = status === rule.status
  return rule.operator === 'is' ? hasMatch : !hasMatch
}

function matchesRule(student: { records: Record<string, string> }, rule: FilterRule, sessions: AttendanceGridSession[]): boolean {
  if (rule.target === 'weekday') {
    const matchingSessions = sessions.filter((s) => getSessionWeekday(s.date) === (rule.weekday ?? 0))
    if (matchingSessions.length === 0) return false
    return matchingSessions.some((session) => {
      const status = student.records[String(session.id)] || 'لا ينطبق'
      return statusMatches(status, rule)
    })
  }

  const status = student.records[String(rule.sessionId)] || 'لا ينطبق'
  return statusMatches(status, rule)
}

function evaluateGroup(student: { records: Record<string, string> }, group: FilterGroup, sessions: AttendanceGridSession[]): boolean {
  if (group.rules.length === 0) return true
  let result = matchesRule(student, group.rules[0], sessions)
  for (let i = 1; i < group.rules.length; i++) {
    if (group.rules[i].connector === 'or') {
      result = result || matchesRule(student, group.rules[i], sessions)
    } else {
      result = result && matchesRule(student, group.rules[i], sessions)
    }
  }
  return result
}

function filterByGroups(students: AttendanceGrid['students'], groups: FilterGroup[], sessions: AttendanceGridSession[]): AttendanceGrid['students'] {
  if (groups.length === 0) return students
  return students.filter((st) => {
    let result = evaluateGroup(st, groups[0], sessions)
    for (let i = 1; i < groups.length; i++) {
      if (groups[i].connector === 'or') {
        result = result || evaluateGroup(st, groups[i], sessions)
      } else {
        result = result && evaluateGroup(st, groups[i], sessions)
      }
    }
    return result
  })
}

export default function AttendancePage() {
  const [user, setUser] = useState<User | null>(null)
  const [sheikhs, setSheikhs] = useState<SheikhInfo[]>([])
  const [selectedSheikh, setSelectedSheikh] = useState<number | ''>('')
  const [grid, setGrid] = useState<AttendanceGrid | null>(null)
  const [allSessions, setAllSessions] = useState<AttendanceGridSession[]>([])
  const [loading, setLoading] = useState(false)

  const [showFilter, setShowFilter] = useState(false)
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [activeSavedFilter, setActiveSavedFilter] = useState<SavedFilter | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveFilterName, setSaveFilterName] = useState('')
  const [warningStudent, setWarningStudent] = useState<AttendanceGridStudent | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    api.getMe().then(setUser).catch(() => {})
    api.getSavedFilters().then((data: any[]) => {
      setSavedFilters(data.map((f: any) => ({ ...f, groups: JSON.parse(f.data) })))
    }).catch(() => {})
  }, [])

  const refreshSavedFilters = () => {
    api.getSavedFilters().then((data: any[]) => {
      setSavedFilters(data.map((f: any) => ({ ...f, groups: JSON.parse(f.data) })))
    }).catch(() => {})
  }

  const handleSaveFilter = async () => {
    const name = saveFilterName.trim()
    if (!name || filterGroups.length === 0) return
    try {
      const data = JSON.stringify(filterGroups)
      if (activeSavedFilter) {
        const updated = await api.updateSavedFilter(activeSavedFilter.id, name, data)
        setActiveSavedFilter({ ...updated, groups: JSON.parse(updated.data) })
      } else {
        const created = await api.createSavedFilter(name, data)
        setActiveSavedFilter({ ...created, groups: JSON.parse(created.data) })
      }
      refreshSavedFilters()
      setShowSaveModal(false)
      setSaveFilterName('')
    } catch {}
  }

  const handleLoadFilter = async (f: SavedFilter, openBuilder = false) => {
    setFilterGroups(f.groups)
    setActiveSavedFilter(f)
    setShowFilter(openBuilder)
    const ruleSessionIds = getSessionRuleIds(f.groups)
    try {
      const data = await api.getAttendanceGrid(selectedSheikh || undefined, undefined, !hasWeekdayRules(f.groups) && ruleSessionIds.length > 0 ? ruleSessionIds : undefined)
      setGrid(data)
    } catch {}
  }

  const handleDeleteSavedFilter = async (id: number) => {
    try {
      await api.deleteSavedFilter(id)
      if (activeSavedFilter?.id === id) {
        setActiveSavedFilter(null)
        setFilterGroups([])
      }
      refreshSavedFilters()
    } catch {}
  }

  const loadGrid = useCallback(async (sheikhId: number | '') => {
    setLoading(true)
    try {
      const data = await api.getAttendanceGrid(sheikhId || undefined)
      setGrid(data)
      setAllSessions(data.sessions)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    api.getSheikhs().then(setSheikhs).catch(console.error)
    loadGrid('')
  }, [loadGrid])

  useEffect(() => {
    loadGrid(selectedSheikh)
  }, [selectedSheikh, loadGrid])

  const hasActiveFilter = filterGroups.some((g) => g.rules.length > 0)

  const weekStart = useMemo(() => {
    const d = new Date()
    const daysSinceSaturday = (d.getDay() + 1) % 7
    d.setDate(d.getDate() - daysSinceSaturday)
    return toLocalDateString(d)
  }, [])

  const today = useMemo(() => toLocalDateString(new Date()), [])

  const weekdayRuleSessions = useMemo(() => {
    if (!grid) return []
    return grid.sessions.filter((s) => s.date >= weekStart)
  }, [grid, weekStart])

  const ruleFilteredStudents = useMemo(() => {
    if (!grid) return []
    return filterByGroups(grid.students, filterGroups, weekdayRuleSessions)
  }, [grid, filterGroups, weekdayRuleSessions])

  const searchedStudents = useMemo(() => {
    if (!searchQuery.trim()) return ruleFilteredStudents
    const q = searchQuery.trim().toLowerCase()
    return ruleFilteredStudents.filter((st) => st.name.toLowerCase().includes(q))
  }, [ruleFilteredStudents, searchQuery])

  const displaySessions = useMemo(() => {
    if (!grid) return []
    if (hasActiveFilter) {
      const sessionRuleIds = new Set(getSessionRuleIds(filterGroups))
      const weekdays = new Set(
        filterGroups.flatMap((g) =>
          g.rules
            .filter((r) => r.target === 'weekday')
            .map((r) => r.weekday ?? 0)
        )
      )
      return grid.sessions.filter((s) => (
        sessionRuleIds.has(s.id) ||
        (s.date >= weekStart && weekdays.has(getSessionWeekday(s.date)))
      ))
    }
    return grid.sessions.filter((s) => s.date >= weekStart)
  }, [grid, filterGroups, hasActiveFilter, weekStart])

  const displayStudents = searchedStudents
  const canSendWarnings = user?.role === 'admin'
  const warningSessions = useMemo(() => {
    if (!grid) return []
    return grid.sessions.filter((s) => s.date >= weekStart && s.date <= today)
  }, [grid, today, weekStart])

  const handleApplyFilter = async (groups: FilterGroup[]) => {
    setFilterGroups(groups)
    setShowFilter(false)
    const ruleSessionIds = getSessionRuleIds(groups)
    try {
      const data = await api.getAttendanceGrid(selectedSheikh || undefined, undefined, !hasWeekdayRules(groups) && ruleSessionIds.length > 0 ? ruleSessionIds : undefined)
      setGrid(data)
    } catch {}
  }

  const clearFilter = () => {
    setFilterGroups([])
    setActiveSavedFilter(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-deep-800">سجل الحضور</h1>
      </div>

      {notice && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm text-center ${
          notice.type === 'success'
            ? 'bg-emerald-50/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {notice.text}
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 md:p-5 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-deep-700 mb-2">اختر الشيخ</label>
          <select
            value={selectedSheikh}
            onChange={(e) => setSelectedSheikh(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
          >
            <option value="">كل الشيوخ</option>
            {sheikhs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition ${
              hasActiveFilter
                ? 'bg-cyan-600 text-white shadow-md dark:bg-cyan-700'
                : 'water-btn-outline'
            }`}
          >
            {hasActiveFilter ? '🔍 تصفية مفعلة' : '🔍 تصفية'}
          </button>
          {hasActiveFilter && (
            <button
              onClick={clearFilter}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/30 transition"
            >
              إلغاء التصفية
            </button>
          )}
          {hasActiveFilter && (
            <button
              onClick={() => {
                setSaveFilterName(activeSavedFilter?.name || '')
                setShowSaveModal(true)
              }}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl text-sm water-btn-outline"
            >
              {activeSavedFilter ? '💾 حفظ التعديلات' : '💾 حفظ التصفية'}
            </button>
          )}
          {savedFilters.map((f) => (
            <div key={f.id} className="flex items-center">
              <button
                onClick={() => handleLoadFilter(f)}
                className={`px-3 py-2 rounded-r-xl text-sm border border-water-300 transition ${
                  activeSavedFilter?.id === f.id
                    ? 'bg-cyan-100/70 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200'
                    : 'bg-water-100/50 hover:bg-water-200/50 text-deep-700'
                }`}
              >
                {f.name}
              </button>
              <button
                onClick={() => handleLoadFilter(f, true)}
                className="px-2 py-2 text-sm border-y border-water-300 text-deep-500 hover:text-deep-800 hover:bg-water-100/50 transition"
              >
                تعديل
              </button>
              <button
                onClick={() => handleDeleteSavedFilter(f.id)}
                className="px-2 py-2 rounded-l-xl text-sm border border-r-0 border-water-300 text-red-400 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/30 transition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
            <div className="glass-strong rounded-2xl p-6 w-full max-w-xs mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-deep-800 mb-3">{activeSavedFilter ? 'حفظ تعديلات التصفية' : 'حفظ التصفية'}</h3>
              <input
                autoFocus
                value={saveFilterName}
                onChange={(e) => setSaveFilterName(e.target.value)}
                placeholder="اسم التصفية"
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 text-sm mb-3"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFilter() }}
              />
              <div className="flex gap-3">
                <button onClick={() => setShowSaveModal(false)} className="flex-1 px-4 py-2 water-btn-outline rounded-xl text-sm">إلغاء</button>
                <button onClick={handleSaveFilter} disabled={!saveFilterName.trim()} className="flex-1 px-4 py-2 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">حفظ</button>
              </div>
            </div>
          </div>
        )}

        {showFilter && allSessions.length > 0 && (
          <AttendanceFilter
            key={activeSavedFilter?.id ?? 'custom-filter'}
            sessions={allSessions}
            initialGroups={filterGroups}
            onApply={handleApplyFilter}
            onCancel={() => setShowFilter(false)}
          />
        )}

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث عن طالب..."
          className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 text-sm"
        />
      </div>

      {loading && (
        <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">جاري التحميل...</div>
      )}

      {grid && displaySessions.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
          لا توجد جلسات هذا الأسبوع
        </div>
      )}

      {grid && displaySessions.length > 0 && (
        <div className="glass-card rounded-2xl p-3 md:p-5">
          <div className="md:hidden space-y-3">
            {displayStudents.map((student) => (
              <div key={student.id} className="rounded-xl border border-water-200/50 bg-white/30 dark:bg-slate-800/30 overflow-hidden">
                <div className="px-4 py-3 border-b border-water-200/30 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-deep-800 truncate">{student.name}</h3>
                  {canSendWarnings && (
                    <button
                      onClick={() => {
                        setNotice(null)
                        setWarningStudent(student)
                      }}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 hover:bg-red-50/70 dark:hover:bg-red-900/30 transition"
                    >
                      إضافة إنذار
                    </button>
                  )}
                </div>
                <div className="divide-y divide-water-200/20">
                  {displaySessions.map((s) => {
                    const status = student.records[String(s.id)] || 'لا ينطبق'
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="text-xs text-deep-600 truncate">{formatDateWithWeekday(s.date)}</span>
                        <span className={`shrink-0 inline-block px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[status] || STATUS_COLORS['غياب']}`}>
                          {status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-water-200/30">
                <th className="text-right py-3 px-3 text-deep-700 sticky right-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm z-10 min-w-[220px]">الطالب</th>
                {displaySessions.map((s) => (
                  <th key={s.id} className="text-center py-3 px-2 text-deep-600 text-xs whitespace-nowrap min-w-[90px]">{formatDateWithWeekday(s.date)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayStudents.map((student) => (
                <tr key={student.id} className="border-b border-water-200/20 hover:bg-water-100/20">
                  <td className="py-2.5 px-3 text-deep-800 font-medium sticky right-0 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm z-10">
                    <div className="flex items-center justify-between gap-3">
                      <span>{student.name}</span>
                      {canSendWarnings && (
                        <button
                          onClick={() => {
                            setNotice(null)
                            setWarningStudent(student)
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-xl text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 hover:bg-red-50/70 dark:hover:bg-red-900/30 transition"
                        >
                          إضافة إنذار
                        </button>
                      )}
                    </div>
                  </td>
                  {displaySessions.map((s) => {
                    const status = student.records[String(s.id)] || 'لا ينطبق'
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
          </div>
          <div className="mt-3 text-center text-sm text-deep-500">
            عدد الطلاب: {displayStudents.length} من {grid.students.length}
          </div>
        </div>
      )}

      {warningStudent && (
        <WarningModal
          student={warningStudent}
          sessions={warningSessions}
          onClose={() => setWarningStudent(null)}
          onSent={() => {
            setWarningStudent(null)
            setNotice({ type: 'success', text: 'تم إرسال الإنذار وحفظه بنجاح' })
          }}
          onError={(message) => setNotice({ type: 'error', text: message })}
        />
      )}
    </div>
  )
}

function WarningModal({
  student,
  sessions,
  onClose,
  onSent,
  onError,
}: {
  student: AttendanceGridStudent
  sessions: AttendanceGridSession[]
  onClose: () => void
  onSent: () => void
  onError: (message: string) => void
}) {
  const defaultSelected = useMemo(
    () => sessions.filter((s) => student.records[String(s.id)] === 'غياب').map((s) => s.id),
    [sessions, student]
  )
  const [selectedIds, setSelectedIds] = useState<number[]>(defaultSelected)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedLabels = sessions
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => formatDateWithWeekday(s.date))

  const toggleSession = (sessionId: number) => {
    setSelectedIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    )
  }

  const handleSend = async () => {
    if (selectedLabels.length === 0) {
      setError('اختر حلقة واحدة على الأقل')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.sendStudentWarning(student.id, selectedLabels)
      onSent()
    } catch (err: any) {
      const message = err.message || 'فشل إرسال الإنذار'
      setError(message)
      onError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-deep-800">إضافة إنذار</h3>
            <p className="text-sm text-deep-500 mt-1">{student.name}</p>
          </div>
          <button onClick={onClose} className="text-deep-400 hover:text-deep-700 transition">✕</button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 rounded-xl text-sm bg-red-50/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium text-deep-700">اختر حلقات هذا الأسبوع التي غاب عنها الطالب بدون اعتذار</p>
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-water-200/50 bg-white/40 dark:bg-slate-800/40 p-4 text-sm text-deep-500 text-center">
              لا توجد حلقات مؤكدة من السبت إلى اليوم
            </div>
          ) : (
            <div className="grid gap-2">
              {sessions.map((session) => {
                const status = student.records[String(session.id)] || 'لا ينطبق'
                const checked = selectedIds.includes(session.id)
                return (
                  <label
                    key={session.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${
                      checked
                        ? 'border-red-300 bg-red-50/70 dark:border-red-800 dark:bg-red-900/20'
                        : 'border-water-200/60 bg-white/40 dark:bg-slate-800/40 hover:bg-water-100/30'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSession(session.id)}
                        className="rounded"
                      />
                      <span className="text-sm text-deep-800">{formatDateWithWeekday(session.date)}</span>
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[status] || STATUS_COLORS['غياب']}`}>
                      {status}
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          <div className="rounded-xl bg-white/40 dark:bg-slate-800/40 border border-water-200/60 p-4 text-sm text-deep-700 whitespace-pre-wrap">
{`انذار رقم x الى الطالب "${student.name}"
 بسبب غيابه بدون اعتذار عن حلقات:
${selectedLabels.map((label) => `* ${label}`).join('\n') || '* ...'}

عدد الانذارات المتبقية قبل الاستبعاد: x`}
          </div>
        </div>

        <div className="flex gap-3 pt-5">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || selectedLabels.length === 0}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال الإنذار'}
          </button>
        </div>
      </div>
    </div>
  )
}

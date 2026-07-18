'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { formatDateWithWeekday, mediaUrl } from '@/lib/format'
import { currentMonthValue, formatMonth, monthRange } from '@/lib/month'
import type { User, SheikhInfo, AttendanceGrid, AttendanceGridSession, AttendanceGridStudent, FilterRule, FilterGroup } from '@/lib/types'
import AttendanceFilter from '@/components/AttendanceFilter'
import ExcelPreviewModal, { type SpreadsheetSheet } from '@/components/ExcelPreviewModal'
import MonthSwitcher from '@/components/MonthSwitcher'
import ScrollableTable from '@/components/ScrollableTable'
import ConfirmDialog from '@/components/ConfirmDialog'

interface SavedFilter {
  id: number
  name: string
  groups: FilterGroup[]
  can_edit?: boolean
  can_delete?: boolean
}

function parseSavedFilter(f: any): SavedFilter {
  return { ...f, groups: JSON.parse(f.data) }
}

function cloneFilterGroups(groups: FilterGroup[]): FilterGroup[] {
  return JSON.parse(JSON.stringify(groups))
}

const STATUS_COLORS: Record<string, string> = {
  'حاضر': 'bg-green-200/60 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'غياب': 'bg-gray-200/50 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400',
  'غياب بعذر': 'bg-yellow-200/60 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'لا ينطبق': 'bg-blue-200/60 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
}

function StudentAvatar({
  name,
  profilePic,
  className = 'w-8 h-8',
  onZoomPic,
}: {
  name: string
  profilePic?: string | null
  className?: string
  onZoomPic?: (url: string) => void
}) {
  return profilePic ? (
    <img
      src={mediaUrl(profilePic)!}
      alt=""
      loading="lazy"
      decoding="async"
      className={`${className} rounded-full object-cover border border-water-300 shrink-0 cursor-pointer hover:opacity-80 transition`}
      onClick={(e) => {
        e.stopPropagation()
        onZoomPic?.(mediaUrl(profilePic)!)
      }}
    />
  ) : (
    <div className={`${className} rounded-full bg-water-200/50 flex items-center justify-center text-deep-400 text-xs border border-water-300 shrink-0`}>
      {name.charAt(0)}
    </div>
  )
}

function getSessionWeekday(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getDay()
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
    if (matchingSessions.length === 0) return true
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
  const [weekPage, setWeekPage] = useState(0)
  const [periodMode, setPeriodMode] = useState<'week' | 'month'>('week')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue)

  const [showFilter, setShowFilter] = useState(false)
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [activeSavedFilter, setActiveSavedFilter] = useState<SavedFilter | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveFilterName, setSaveFilterName] = useState('')
  const [warningStudent, setWarningStudent] = useState<AttendanceGridStudent | null>(null)
  const [previewPic, setPreviewPic] = useState<string | null>(null)
  const [excelSheets, setExcelSheets] = useState<SpreadsheetSheet[] | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)
  const [filterToDelete, setFilterToDelete] = useState<SavedFilter | null>(null)
  const [deletingFilter, setDeletingFilter] = useState(false)

  useEffect(() => {
    api.getMe().then(setUser).catch(() => {})
    api.getSavedFilters().then((data: any[]) => {
      setSavedFilters(data.map(parseSavedFilter))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const refreshSavedFilters = () => {
    api.getSavedFilters().then((data: any[]) => {
      setSavedFilters(data.map(parseSavedFilter))
    }).catch(() => {})
  }

  const handleSaveFilter = async () => {
    const name = saveFilterName.trim()
    if (!name || filterGroups.length === 0) return
    const editingExisting = Boolean(activeSavedFilter && activeSavedFilter.can_edit !== false)
    try {
      const data = JSON.stringify(filterGroups)
      if (editingExisting && activeSavedFilter) {
        const updated = await api.updateSavedFilter(activeSavedFilter.id, name, data)
        const parsed = parseSavedFilter(updated)
        setActiveSavedFilter(parsed)
        setSavedFilters((prev) => prev.map((f) => (f.id === parsed.id ? parsed : f)))
      } else {
        const created = await api.createSavedFilter(name, data)
        const parsed = parseSavedFilter(created)
        setActiveSavedFilter(parsed)
        setSavedFilters((prev) => [parsed, ...prev])
      }
      refreshSavedFilters()
      setShowSaveModal(false)
      setSaveFilterName('')
      setNotice({
        type: 'success',
        text: editingExisting
          ? 'تم حفظ تعديلات التصفية'
          : activeSavedFilter
            ? 'تم حفظ نسخة جديدة من التصفية'
            : 'تم حفظ التصفية',
      })
    } catch {}
  }

  const handleLoadFilter = async (f: SavedFilter, openBuilder = false) => {
    const groups = cloneFilterGroups(f.groups)
    setFilterGroups(groups)
    setActiveSavedFilter({ ...f, groups })
    setShowFilter(openBuilder)
    const ruleSessionIds = getSessionRuleIds(groups)
    try {
      const data = await api.getAttendanceGrid(
        selectedSheikh || undefined,
        undefined,
        ruleSessionIds.length > 0 ? ruleSessionIds : undefined,
        activeRange.start,
        activeRange.end
      )
      setGrid(data)
    } catch {
      setNotice({ type: 'error', text: 'تعذر تحميل التصفية المحفوظة' })
    }
  }

  const handleDeleteSavedFilter = async (id: number) => {
    setDeletingFilter(true)
    try {
      await api.deleteSavedFilter(id)
      if (activeSavedFilter?.id === id) {
        setActiveSavedFilter(null)
        setFilterGroups([])
      }
      refreshSavedFilters()
      setFilterToDelete(null)
      setNotice({ type: 'success', text: 'تم حذف التصفية' })
    } catch {
      setNotice({ type: 'error', text: 'تعذر حذف التصفية' })
    } finally {
      setDeletingFilter(false)
    }
  }

  const loadGrid = useCallback(async (sheikhId: number | '', dateFrom: string, dateTo: string) => {
    setLoading(true)
    try {
      const data = await api.getAttendanceGrid(sheikhId || undefined, undefined, undefined, dateFrom, dateTo)
      setGrid(data)
    } catch (err) {
      console.error(err)
      setNotice({ type: 'error', text: 'تعذر تحميل سجل الحضور. حاول مرة أخرى.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    api.getSheikhs().then(setSheikhs).catch(console.error)
    api.getPastSessions()
      .then((sessions: { id: number; date: string; circle_id: number }[]) => {
        setAllSessions(sessions.map((session) => ({
          id: session.id,
          date: session.date,
          circle_id: session.circle_id,
        })))
      })
      .catch(console.error)
  }, [])

  const hasActiveFilter = filterGroups.some((g) => g.rules.length > 0)
  const weekStartDay = selectedSheikh
    ? (sheikhs.find((sheikh) => sheikh.id === selectedSheikh)?.week_start_day ?? 6)
    : 6

  const weekRange = useMemo(() => {
    const d = new Date()
    const daysSinceWeekStart = (d.getDay() - weekStartDay + 7) % 7
    d.setDate(d.getDate() - daysSinceWeekStart - (weekPage * 7))
    const start = toLocalDateString(d)
    d.setDate(d.getDate() + 6)
    return { start, end: toLocalDateString(d) }
  }, [weekPage, weekStartDay])

  const weekLabel = useMemo(() => {
    const format = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${format.format(new Date(`${weekRange.start}T12:00:00`))} - ${format.format(new Date(`${weekRange.end}T12:00:00`))}`
  }, [weekRange])

  const activeRange = useMemo(
    () => periodMode === 'week' ? weekRange : monthRange(selectedMonth),
    [periodMode, selectedMonth, weekRange]
  )

  const periodLabel = useMemo(
    () => periodMode === 'week' ? weekLabel : formatMonth(selectedMonth),
    [periodMode, selectedMonth, weekLabel]
  )

  useEffect(() => {
    loadGrid(selectedSheikh, activeRange.start, activeRange.end)
  }, [activeRange.end, activeRange.start, loadGrid, selectedSheikh])

  const weekdayRuleSessions = useMemo(() => {
    if (!grid) return []
    return grid.sessions.filter((s) => s.date >= activeRange.start && s.date <= activeRange.end)
  }, [activeRange, grid])

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
        s.date >= activeRange.start &&
        s.date <= activeRange.end &&
        (sessionRuleIds.has(s.id) || weekdays.has(getSessionWeekday(s.date)))
      ))
    }
    if (periodMode === 'week') {
      return grid.sessions.filter((s) => s.date >= weekRange.start && (weekPage === 0 || s.date <= weekRange.end))
    }
    return grid.sessions.filter((s) => s.date >= activeRange.start && s.date <= activeRange.end)
  }, [activeRange, filterGroups, grid, hasActiveFilter, periodMode, weekPage, weekRange])

  const displayStudents = useMemo(() => {
    return [...searchedStudents].sort((a, b) => {
      const sheikhCompare = (a.sheikh_name || '').localeCompare(b.sheikh_name || '', 'ar')
      if (sheikhCompare !== 0) return sheikhCompare
      return a.name.localeCompare(b.name, 'ar')
    })
  }, [searchedStudents])
  const canSendWarnings = user?.role === 'admin'

  const handleApplyFilter = async (groups: FilterGroup[]) => {
    const nextGroups = cloneFilterGroups(groups)
    setFilterGroups(nextGroups)
    setShowFilter(false)
    const ruleSessionIds = getSessionRuleIds(nextGroups)
    try {
      if (activeSavedFilter && activeSavedFilter.can_edit !== false) {
        const updated = await api.updateSavedFilter(activeSavedFilter.id, activeSavedFilter.name, JSON.stringify(nextGroups))
        const parsed = parseSavedFilter(updated)
        setActiveSavedFilter(parsed)
        setSavedFilters((prev) => prev.map((f) => (f.id === parsed.id ? parsed : f)))
        setNotice({ type: 'success', text: 'تم حفظ تعديلات التصفية' })
      }
      const data = await api.getAttendanceGrid(
        selectedSheikh || undefined,
        undefined,
        ruleSessionIds.length > 0 ? ruleSessionIds : undefined,
        activeRange.start,
        activeRange.end
      )
      setGrid(data)
    } catch {
      setNotice({ type: 'error', text: 'فشل حفظ أو تطبيق التصفية' })
    }
  }

  const clearFilter = () => {
    setFilterGroups([])
    setActiveSavedFilter(null)
    loadGrid(selectedSheikh, activeRange.start, activeRange.end)
  }

  const openExcelPreview = () => {
    const sessionColumns = displaySessions.map((session) => ({
      id: `session_${session.id}`,
      label: formatDateWithWeekday(session.date),
    }))
    setExcelSheets([{
      name: 'سجل الحضور',
      columns: [
        { id: 'student', label: 'الطالب' },
        { id: 'sheikh', label: 'الشيخ' },
        ...sessionColumns,
      ],
      rows: displayStudents.map((student) => {
        const row: Record<string, string | number | null> = {
          student: student.name,
          sheikh: student.sheikh_name || 'بدون شيخ',
        }
        displaySessions.forEach((session) => {
          row[`session_${session.id}`] = student.records[String(session.id)] || 'لا ينطبق'
        })
        return row
      }),
    }])
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-deep-900">سجل الحضور</h1>
          <p className="text-sm text-deep-500 mt-1">متابعة حضور الطلاب حسب الجلسات والتصفيات المحفوظة</p>
        </div>
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

      <div className="glass-card rounded-lg p-4 md:p-5 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-deep-800 mb-2">اختر الشيخ</label>
          <select
            value={selectedSheikh}
            onChange={(e) => setSelectedSheikh(e.target.value ? Number(e.target.value) : '')}
            className="surface-field w-full px-4 py-2.5 rounded-lg text-sm"
          >
            <option value="">كل الشيوخ</option>
            {sheikhs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition ${
              hasActiveFilter
                ? 'bg-cyan-600 text-white shadow-md dark:bg-cyan-700'
                : 'water-btn-outline'
            }`}
          >
            {hasActiveFilter ? 'تصفية مفعلة' : 'تصفية'}
          </button>
          {hasActiveFilter && (
            <button
              onClick={clearFilter}
              className="flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-900/30 transition"
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
              {activeSavedFilter
                ? (activeSavedFilter.can_edit === false ? 'حفظ نسخة' : 'حفظ التعديلات')
                : 'حفظ التصفية'}
            </button>
          )}
          {savedFilters.map((f) => (
            <div key={f.id} className="flex items-center">
              <button
                onClick={() => handleLoadFilter(f)}
                className={`px-3 py-2 rounded-r-lg text-sm border border-water-300 transition ${
                  activeSavedFilter?.id === f.id
                    ? 'bg-cyan-100/70 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200'
                    : 'bg-white/80 dark:bg-slate-800/70 hover:bg-water-100/80 text-deep-700'
                }`}
              >
                {f.name}
              </button>
              {f.can_edit !== false && (
                <button
                  onClick={() => handleLoadFilter(f, true)}
                  className="px-2 py-2 text-sm border-y border-water-300 bg-white/70 dark:bg-slate-800/60 text-deep-600 hover:text-deep-900 hover:bg-water-100/80 transition"
                >
                  تعديل
                </button>
              )}
              {f.can_delete !== false && (
                <button
                  onClick={() => setFilterToDelete(f)}
                  aria-label={`حذف تصفية ${f.name}`}
                  className="px-2 py-2 rounded-l-lg text-sm border border-r-0 border-water-300 bg-white/70 dark:bg-slate-800/60 text-red-500 hover:text-red-700 hover:bg-red-50/70 dark:hover:bg-red-900/30 transition"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {showSaveModal && (
          <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
            <div className="mobile-sheet glass-strong rounded-lg p-6 w-full max-w-xs mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-deep-800 mb-3">
                {activeSavedFilter
                  ? (activeSavedFilter.can_edit === false ? 'حفظ نسخة من التصفية' : 'حفظ تعديلات التصفية')
                  : 'حفظ التصفية'}
              </h3>
              <input
                autoFocus
                value={saveFilterName}
                onChange={(e) => setSaveFilterName(e.target.value)}
                placeholder="اسم التصفية"
                className="surface-field w-full px-4 py-2.5 rounded-lg text-sm mb-3"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFilter() }}
              />
              <div className="flex gap-3">
                <button onClick={() => setShowSaveModal(false)} className="flex-1 px-4 py-2 water-btn-outline rounded-lg text-sm">إلغاء</button>
                <button onClick={handleSaveFilter} disabled={!saveFilterName.trim()} className="flex-1 px-4 py-2 water-btn text-white rounded-lg text-sm font-medium disabled:opacity-50">حفظ</button>
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
          className="surface-field w-full px-4 py-2.5 rounded-lg text-sm"
        />
      </div>

      {loading && (
        <div className="glass-card rounded-lg p-8 text-center text-deep-600/80">جاري التحميل...</div>
      )}

      {grid && !loading && (
        <div className="glass-card rounded-lg px-3 py-3 md:px-5 mb-4">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setPeriodMode('week')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${periodMode === 'week' ? 'water-btn text-white' : 'water-btn-outline'}`}
            >
              عرض أسبوعي
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('month')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${periodMode === 'month' ? 'water-btn text-white' : 'water-btn-outline'}`}
            >
              عرض شهري
            </button>
          </div>
          {periodMode === 'week' ? (
          <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setWeekPage((page) => page + 1)}
            className="water-btn-outline rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap"
          >
            أسبوع أقدم
          </button>
          <div className="text-center min-w-0">
            <div className="text-sm font-semibold text-deep-800">{weekPage === 0 ? 'الأسبوع الحالي' : `قبل ${weekPage} ${weekPage === 1 ? 'أسبوع' : 'أسابيع'}`}</div>
            <div className="text-xs text-deep-500 mt-0.5 truncate">{weekLabel}</div>
          </div>
          <button
            type="button"
            onClick={() => setWeekPage((page) => Math.max(0, page - 1))}
            disabled={weekPage === 0}
            className="water-btn-outline rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            أسبوع أحدث
          </button>
          </div>
          ) : (
            <MonthSwitcher value={selectedMonth} onChange={setSelectedMonth} />
          )}
        </div>
      )}

      {grid && displaySessions.length === 0 && (
        <div className="glass-card rounded-lg p-8 text-center text-deep-600/80">
          لا توجد جلسات في هذه الفترة
        </div>
      )}

      {grid && displaySessions.length > 0 && (
        <div className="glass-card rounded-lg p-3 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-deep-800">الحضور — {periodLabel}</h2>
              <p className="text-xs text-deep-500 mt-1">سيشمل التصدير النتائج المعروضة بعد التصفية والبحث.</p>
            </div>
            <button type="button" onClick={openExcelPreview} className="water-btn text-white rounded-lg px-4 py-2 text-sm font-semibold">
              معاينة وتصدير Excel
            </button>
          </div>
          {isDesktop === false && <div className="space-y-3">
            {displayStudents.map((student) => (
              <div key={student.id} className="rounded-lg border border-water-200/80 bg-white/85 dark:bg-slate-800/70 overflow-hidden">
                <div className="px-4 py-3 border-b border-water-200/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <StudentAvatar name={student.name} profilePic={student.profile_pic} className="w-9 h-9" onZoomPic={setPreviewPic} />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-deep-800 truncate">{student.name}</h3>
                      <p className="text-xs text-deep-500 truncate">{student.sheikh_name || 'بدون شيخ'}</p>
                    </div>
                  </div>
                  {canSendWarnings && (
                    <button
                      onClick={() => {
                        setNotice(null)
                        setWarningStudent(student)
                      }}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 hover:bg-red-50/70 dark:hover:bg-red-900/30 transition"
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
          </div>}

          {isDesktop === true && <ScrollableTable>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-water-200/30">
                <th className="data-table-header text-right py-3 px-3 text-deep-800 sticky right-0 z-10 min-w-[240px]">الطالب</th>
                {displaySessions.map((s) => (
                  <th key={s.id} className="data-table-header text-center py-3 px-2 text-deep-700 text-xs whitespace-nowrap min-w-[96px]">{formatDateWithWeekday(s.date)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayStudents.map((student) => (
                <tr key={student.id} className="border-b border-water-200/40 hover:bg-water-50/80 dark:hover:bg-slate-800/70">
                  <td className="data-table-sticky py-2.5 px-3 text-deep-900 font-semibold sticky right-0 z-10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <StudentAvatar name={student.name} profilePic={student.profile_pic} onZoomPic={setPreviewPic} />
                        <span className="min-w-0">
                          <span className="block truncate">{student.name}</span>
                          <span className="block text-xs font-normal text-deep-500 truncate">{student.sheikh_name || 'بدون شيخ'}</span>
                        </span>
                      </div>
                      {canSendWarnings && (
                        <button
                          onClick={() => {
                            setNotice(null)
                            setWarningStudent(student)
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-lg text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 hover:bg-red-50/70 dark:hover:bg-red-900/30 transition"
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
          </ScrollableTable>}
          <div className="mt-3 text-center text-sm text-deep-500">
            عدد الطلاب: {displayStudents.length} من {grid.students.length}
          </div>
        </div>
      )}

      {warningStudent && (
        <WarningModal
          student={warningStudent}
          sessions={displaySessions}
          onClose={() => setWarningStudent(null)}
          onSent={() => {
            setWarningStudent(null)
            setNotice({ type: 'success', text: 'تم إرسال الإنذار وحفظه بنجاح' })
          }}
          onError={(message) => setNotice({ type: 'error', text: message })}
        />
      )}

      {previewPic && <ImagePreviewModal src={previewPic} onClose={() => setPreviewPic(null)} />}
      {excelSheets && (
        <ExcelPreviewModal
          sheets={excelSheets}
          filename={`zamzam-attendance-${periodMode === 'month' ? selectedMonth : weekRange.start}.xlsx`}
          onClose={() => setExcelSheets(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(filterToDelete)}
        title="حذف التصفية"
        message={`هل تريد حذف تصفية "${filterToDelete?.name || ''}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        busy={deletingFilter}
        onClose={() => {
          if (!deletingFilter) setFilterToDelete(null)
        }}
        onConfirm={() => {
          if (filterToDelete) void handleDeleteSavedFilter(filterToDelete.id)
        }}
      />
    </div>
  )
}

function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <img src={src} alt="صورة الطالب" className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
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
  const [copied, setCopied] = useState(false)
  const [previewNumbers, setPreviewNumbers] = useState({
    next: student.next_warning_number ?? null,
    remaining: student.remaining_warnings ?? null,
  })

  useEffect(() => {
    api.getStudentWarningPreview(student.id)
      .then((data: { next_warning_number: number; remaining_warnings: number }) => {
        setPreviewNumbers({ next: data.next_warning_number, remaining: data.remaining_warnings })
      })
      .catch(() => setError('تعذر تحميل أرقام الإنذار'))
  }, [student.id])

  const selectedLabels = sessions
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => formatDateWithWeekday(s.date))

  const previewMessage = `انذار رقم ${previewNumbers.next ?? '...'} الى الطالب "${student.name}"
 بسبب غيابه بدون اعتذار عن حلقات:
${selectedLabels.map((label) => `* ${label}`).join('\n') || '* ...'}

عدد الانذارات المتبقية قبل الاستبعاد: ${previewNumbers.remaining ?? '...'}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewMessage)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('تعذر نسخ نص الإنذار')
    }
  }

  const toggleSession = (sessionId: number) => {
    setSelectedIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    )
  }

  const handleSend = async () => {
    if (selectedLabels.length === 0) {
      setError('اختر جلسة واحدة على الأقل')
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
    <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="mobile-sheet glass-strong rounded-2xl p-5 sm:p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
          <p className="text-sm font-medium text-deep-700">اختر الجلسات المعروضة حسب التصفية التي غاب عنها الطالب بدون اعتذار</p>
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-water-200/50 bg-white/40 dark:bg-slate-800/40 p-4 text-sm text-deep-500 text-center">
              لا توجد حلقات مطابقة للتصفية
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

          <div className="relative rounded-xl bg-white/40 dark:bg-slate-800/40 border border-water-200/60 p-4 pl-12 text-sm text-deep-700 whitespace-pre-wrap">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="نسخ نص الإنذار"
              title="نسخ نص الإنذار"
              className="absolute top-3 left-3 rounded-lg p-1.5 text-deep-500 hover:bg-water-100/60 hover:text-deep-800 transition"
            >
              {copied ? (
                <span className="text-xs text-green-600">تم</span>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
            {previewMessage}
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

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getArabicDay, mediaUrl } from '@/lib/format'
import type { ProgressCategory, QuranProgressEntry, QuranProgressInput, QuranRangeType, Session, SessionAttendance, SheikhGroup } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  'غياب': 'status-badge bg-gray-100/50 text-gray-600 border-gray-200 dark:bg-gray-700/40 dark:text-gray-400 dark:border-gray-700',
  'حاضر': 'status-badge bg-green-100/60 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
  'غياب بعذر': 'status-badge bg-yellow-100/60 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  'لا ينطبق': 'status-badge bg-blue-100/60 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
}

function StudentRow({
  student,
  circleSheikhs,
  onStatusChange,
  onNotesChange,
  onSheikhChange,
  onZoomPic,
  saving,
  disabled,
}: {
  student: { id: number; name: string; status: string; notes?: string; sheikh_id: number | null; profile_pic?: string | null }
  circleSheikhs: { id: number; name: string }[]
  onStatusChange: (status: string) => void
  onNotesChange: (notes: string) => void
  onSheikhChange: (sheikhId: number) => void
  onZoomPic: (url: string) => void
  saving: boolean
  disabled: boolean
}) {
  const [notes, setNotes] = useState(student.notes || '')

  const handleNotesChange = (value: string) => {
    setNotes(value)
    onNotesChange(value)
  }

  useEffect(() => {
    setNotes(student.notes || '')
  }, [student.notes])

  return (
    <div className="py-3 px-3 md:grid md:grid-cols-[36px_1fr_90px_120px_1fr] md:gap-2 md:items-center md:py-2.5 md:px-4 hover:bg-water-100/30 rounded-xl transition">
      <div className="flex items-center gap-3 md:contents">
        {student.profile_pic ? (
          <img
            src={mediaUrl(student.profile_pic)!}
            alt=""
            className="w-10 h-10 md:w-8 md:h-8 rounded-full object-cover border border-water-300 shrink-0 cursor-pointer hover:opacity-80 transition"
            onClick={() => onZoomPic(mediaUrl(student.profile_pic)!)}
          />
        ) : (
          <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-water-200/50 flex items-center justify-center text-deep-400 text-sm md:text-xs border border-water-300 shrink-0">
            {student.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1 md:contents">
          <span className="block font-medium text-deep-800 truncate">{student.name}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 mt-3 md:contents">
        <label className="block md:contents">
          <span className="block md:hidden text-[11px] text-deep-500 mb-1">الحالة</span>
      <select
        value={student.status}
        onChange={(e) => onStatusChange(e.target.value)}
        disabled={disabled}
            className={`w-full px-2 py-2 md:py-1.5 rounded-lg text-sm font-medium transition text-center ${STATUS_STYLES[student.status] || STATUS_STYLES['غياب']} ${saving ? 'opacity-60' : ''}`}
      >
        <option value="غياب" className="bg-gray-100 text-gray-600">غياب</option>
        <option value="حاضر" className="bg-green-100 text-green-700">حاضر</option>
        <option value="غياب بعذر" className="bg-yellow-100 text-yellow-700">غياب بعذر</option>
        <option value="لا ينطبق" className="bg-blue-100 text-blue-700">لا ينطبق</option>
      </select>
        </label>
        <label className="block md:contents">
          <span className="block md:hidden text-[11px] text-deep-500 mb-1">الشيخ</span>
      <select
        value={student.sheikh_id ?? ''}
        onChange={(e) => onSheikhChange(Number(e.target.value))}
        disabled={disabled}
            className="w-full px-2 py-2 md:py-1.5 text-sm md:text-xs bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
      >
        {circleSheikhs.map((sh) => (
          <option key={sh.id} value={sh.id}>{sh.name}</option>
        ))}
      </select>
        </label>
        <label className="block md:contents">
          <span className="block md:hidden text-[11px] text-deep-500 mb-1">ملاحظات</span>
      <input
        value={notes}
        onChange={(e) => handleNotesChange(e.target.value)}
        disabled={disabled}
        placeholder="ملاحظات..."
            className="w-full px-3 py-2 md:py-1.5 text-sm md:text-xs bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
      />
        </label>
      </div>
    </div>
  )
}

function SheikhAccordion({
  group,
  circleSheikhs,
  onUpdateStatus,
  onUpdateNotes,
  onUpdateSheikh,
  onZoomPic,
  savingIds,
  expanded,
  onToggle,
  disabled,
}: {
  group: SheikhGroup
  circleSheikhs: { id: number; name: string }[]
  onUpdateStatus: (studentId: number, newStatus: string) => void
  onUpdateNotes: (studentId: number, notes: string) => void
  onUpdateSheikh: (studentId: number, sheikhId: number) => void
  onZoomPic: (url: string) => void
  savingIds: Set<number>
  expanded: boolean
  onToggle: () => void
  disabled: boolean
}) {

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-water-100/30 hover:bg-water-200/30 transition"
      >
        <span className="text-lg font-bold text-deep-800">{group.sheikh.name}</span>
        <span className="text-deep-500 text-sm">
          {group.students.filter((s) => s.status !== 'غياب').length}/{group.students.length}
        </span>
      </button>

      {expanded && (
        <div className="divide-y divide-water-200/30">
          <div className="hidden md:grid grid-cols-[36px_1fr_90px_120px_1fr] gap-2 items-center py-2 px-4 text-xs font-medium text-deep-500 bg-water-100/20">
            <span></span>
            <span>الطالب</span>
            <span className="text-center">الحالة</span>
            <span className="text-center">الشيخ</span>
            <span>ملاحظات</span>
          </div>
          {group.students.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              circleSheikhs={circleSheikhs}
              onStatusChange={(status) => onUpdateStatus(student.id, status)}
              onNotesChange={(notes) => onUpdateNotes(student.id, notes)}
              onSheikhChange={(sheikhId) => onUpdateSheikh(student.id, sheikhId)}
              onZoomPic={onZoomPic}
              saving={savingIds.has(student.id)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
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

const PROGRESS_CATEGORY_LABELS: Record<ProgressCategory, string> = {
  new_memorization: 'حفظ جديد',
  recent_revision: 'مراجعة قريبة',
  old_revision: 'مراجعة قديمة',
  test: 'اختبار',
}

function QuranProgressEditor({
  students,
  entries,
  disabled,
  onSave,
}: {
  students: { id: number; name: string; sheikh_id: number | null }[]
  entries: QuranProgressEntry[]
  disabled: boolean
  onSave: (input: QuranProgressInput) => Promise<void>
}) {
  const [studentId, setStudentId] = useState(students[0]?.id || 0)
  const [category, setCategory] = useState<ProgressCategory>('new_memorization')
  const [rangeType, setRangeType] = useState<QuranRangeType>('page')
  const [fromPage, setFromPage] = useState(1)
  const [toPage, setToPage] = useState(1)
  const [fromSurah, setFromSurah] = useState(1)
  const [fromAyah, setFromAyah] = useState(1)
  const [toSurah, setToSurah] = useState(1)
  const [toAyah, setToAyah] = useState(1)
  const [quality, setQuality] = useState(3)
  const [mistakes, setMistakes] = useState(0)
  const [notes, setNotes] = useState('')
  const [nextAssignment, setNextAssignment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const existing = entries.find((entry) => entry.student_id === studentId && entry.category === category)
    if (!existing) {
      setRangeType('page')
      setFromPage(1)
      setToPage(1)
      setFromSurah(1)
      setFromAyah(1)
      setToSurah(1)
      setToAyah(1)
      setQuality(3)
      setMistakes(0)
      setNotes('')
      setNextAssignment('')
      return
    }
    setRangeType(existing.range_type)
    setFromPage(existing.from_page || 1)
    setToPage(existing.to_page || existing.from_page || 1)
    setFromSurah(existing.from_surah || 1)
    setFromAyah(existing.from_ayah || 1)
    setToSurah(existing.to_surah || existing.from_surah || 1)
    setToAyah(existing.to_ayah || existing.from_ayah || 1)
    setQuality(existing.quality_score)
    setMistakes(existing.mistakes)
    setNotes(existing.notes || '')
    setNextAssignment(existing.next_assignment || '')
  }, [category, entries, studentId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const student = students.find((item) => item.id === studentId)
    if (!student) return
    setSaving(true)
    setError('')
    try {
      await onSave({
        student_id: studentId,
        sheikh_id: student.sheikh_id,
        category,
        range_type: rangeType,
        from_page: rangeType === 'page' ? fromPage : null,
        to_page: rangeType === 'page' ? toPage : null,
        from_surah: rangeType === 'surah_ayah' ? fromSurah : null,
        from_ayah: rangeType === 'surah_ayah' ? fromAyah : null,
        to_surah: rangeType === 'surah_ayah' ? toSurah : null,
        to_ayah: rangeType === 'surah_ayah' ? toAyah : null,
        quality_score: quality,
        mistakes,
        notes: notes || null,
        next_assignment: nextAssignment || null,
      })
    } catch (err: any) {
      setError(err.message || 'تعذر حفظ المتابعة')
    } finally {
      setSaving(false)
    }
  }

  if (students.length === 0) return null

  return (
    <section className="glass-card rounded-2xl p-4 md:p-5 mt-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-deep-800">متابعة الحفظ والمراجعة</h2>
        <p className="text-xs text-deep-500 mt-1">اختياري — اختر الطالب والنوع لإضافة سجل أو تعديل السجل الموجود.</p>
      </div>
      {error && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-deep-600">
          الطالب
          <select value={studentId} onChange={(event) => setStudentId(Number(event.target.value))} disabled={disabled} className="surface-field mt-1 w-full rounded-xl px-3 py-2">
            {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>
        </label>
        <label className="text-sm text-deep-600">
          النوع
          <select value={category} onChange={(event) => setCategory(event.target.value as ProgressCategory)} disabled={disabled} className="surface-field mt-1 w-full rounded-xl px-3 py-2">
            {(Object.keys(PROGRESS_CATEGORY_LABELS) as ProgressCategory[]).map((key) => <option key={key} value={key}>{PROGRESS_CATEGORY_LABELS[key]}</option>)}
          </select>
        </label>
        <label className="text-sm text-deep-600">
          طريقة تحديد المقدار
          <select value={rangeType} onChange={(event) => setRangeType(event.target.value as QuranRangeType)} disabled={disabled} className="surface-field mt-1 w-full rounded-xl px-3 py-2">
            <option value="page">بالصفحات</option>
            <option value="surah_ayah">بالسورة والآية</option>
          </select>
        </label>
        {rangeType === 'page' ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-deep-600">من صفحة<input type="number" min={1} max={604} value={fromPage} onChange={(event) => setFromPage(Number(event.target.value))} disabled={disabled} className="surface-field mt-1 w-full rounded-xl px-3 py-2" /></label>
            <label className="text-sm text-deep-600">إلى صفحة<input type="number" min={fromPage} max={604} value={toPage} onChange={(event) => setToPage(Number(event.target.value))} disabled={disabled} className="surface-field mt-1 w-full rounded-xl px-3 py-2" /></label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-deep-600">من سورة/آية<div className="mt-1 flex gap-1"><input aria-label="رقم سورة البداية" type="number" min={1} max={114} value={fromSurah} onChange={(event) => setFromSurah(Number(event.target.value))} disabled={disabled} className="surface-field w-1/2 rounded-xl px-2 py-2" /><input aria-label="رقم آية البداية" type="number" min={1} value={fromAyah} onChange={(event) => setFromAyah(Number(event.target.value))} disabled={disabled} className="surface-field w-1/2 rounded-xl px-2 py-2" /></div></label>
            <label className="text-sm text-deep-600">إلى سورة/آية<div className="mt-1 flex gap-1"><input aria-label="رقم سورة النهاية" type="number" min={1} max={114} value={toSurah} onChange={(event) => setToSurah(Number(event.target.value))} disabled={disabled} className="surface-field w-1/2 rounded-xl px-2 py-2" /><input aria-label="رقم آية النهاية" type="number" min={1} value={toAyah} onChange={(event) => setToAyah(Number(event.target.value))} disabled={disabled} className="surface-field w-1/2 rounded-xl px-2 py-2" /></div></label>
          </div>
        )}
        <label className="text-sm text-deep-600">التقييم (1–5)<input type="number" min={1} max={5} value={quality} onChange={(event) => setQuality(Number(event.target.value))} disabled={disabled} className="surface-field mt-1 w-full rounded-xl px-3 py-2" /></label>
        <label className="text-sm text-deep-600">عدد الأخطاء<input type="number" min={0} value={mistakes} onChange={(event) => setMistakes(Number(event.target.value))} disabled={disabled} className="surface-field mt-1 w-full rounded-xl px-3 py-2" /></label>
        <label className="text-sm text-deep-600 md:col-span-2">ملاحظات<input value={notes} onChange={(event) => setNotes(event.target.value)} disabled={disabled} className="surface-field mt-1 w-full rounded-xl px-3 py-2" /></label>
        <label className="text-sm text-deep-600 md:col-span-2">التكليف القادم<input value={nextAssignment} onChange={(event) => setNextAssignment(event.target.value)} disabled={disabled} className="surface-field mt-1 w-full rounded-xl px-3 py-2" /></label>
        <button type="submit" disabled={disabled || saving} className="water-btn rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">
          {saving ? 'جاري الحفظ...' : entries.some((entry) => entry.student_id === studentId && entry.category === category) ? 'تحديث المتابعة' : 'حفظ المتابعة'}
        </button>
      </form>
    </section>
  )
}

export default function SessionAttendancePage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<SessionAttendance | null>(null)
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [editingDate, setEditingDate] = useState(false)
  const [editDateVal, setEditDateVal] = useState('')
  const pendingUpdates = useRef<Map<number, { status?: string; notes?: string; sheikh_id?: number }>>(new Map())
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushInFlight = useRef(false)
  const dataRef = useRef<SessionAttendance | null>(null)
  const [expandedSheikhs, setExpandedSheikhs] = useState<Set<number>>(new Set())
  const [userRole, setUserRole] = useState<string>('')
  const [previewPic, setPreviewPic] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [progressEnabled, setProgressEnabled] = useState(false)
  const [progressEntries, setProgressEntries] = useState<QuranProgressEntry[]>([])
  const [showReopen, setShowReopen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [reopening, setReopening] = useState(false)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  const toggleSheikh = useCallback((id: number) => {
    setExpandedSheikhs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const allExpanded = data ? data.sheikh_groups.length > 0 && expandedSheikhs.size === data.sheikh_groups.length : false

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    Promise.all([
      api.getSessionAttendance(Number(params.id)),
      api.getAllSessions(),
      api.getMe(),
      api.getSessionProgress(Number(params.id)),
    ]).then(([sessionData, sessions, currentUser, progress]) => {
      if (cancelled) return
      setData(sessionData)
      dataRef.current = sessionData
      setAllSessions(sessions)
      setUserRole(currentUser.role || '')
      const enabled = Boolean(currentUser.tahfiz?.progress_tracking_enabled)
      setProgressEnabled(enabled)
      setProgressEntries(enabled ? progress.entries : [])
    }).catch((err: any) => {
      if (!cancelled) setLoadError(err.message || 'تعذر تحميل الجلسة')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [params.id])

  const circleSessions = useMemo(() => {
    if (!data) return []
    return allSessions
      .filter((s) => s.circle_id === data.circle_id)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [allSessions, data])

  const currentIndex = useMemo(() => {
    return circleSessions.findIndex((s) => s.id === Number(params.id))
  }, [circleSessions, params.id])

  const prevSession = currentIndex > 0 ? circleSessions[currentIndex - 1] : null
  const nextSession = currentIndex < circleSessions.length - 1 ? circleSessions[currentIndex + 1] : null

  const flushUpdates = useCallback(async (): Promise<boolean> => {
    if (flushInFlight.current) return false
    const sessionData = dataRef.current
    const updates = new Map(pendingUpdates.current)
    if (!sessionData || updates.size === 0) return true

    flushInFlight.current = true
    pendingUpdates.current = new Map()
    const ids = new Set(updates.keys())
    setSavingIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
    setSaveState('saving')
    setSaveError('')
    let succeeded = false

    try {
      const payload = Array.from(updates.entries()).map(([studentId, update]) => {
        const student = sessionData.sheikh_groups.flatMap((group) => group.students).find((item) => item.id === studentId)
        return {
          student_id: studentId,
          status: update.status ?? student?.status ?? 'غياب',
          notes: update.notes !== undefined ? update.notes : (student?.notes || null),
          sheikh_id: update.sheikh_id !== undefined ? update.sheikh_id : student?.sheikh_id,
        }
      })
      const result = await api.batchAttendance(sessionData.session_id, payload, sessionData.version)
      setData((current) => current ? { ...current, version: result.version } : current)
      if (dataRef.current) dataRef.current = { ...dataRef.current, version: result.version }
      setSaveState('saved')
      succeeded = true
      return true
    } catch (err: any) {
      updates.forEach((update, studentId) => {
        const newer = pendingUpdates.current.get(studentId) || {}
        pendingUpdates.current.set(studentId, { ...update, ...newer })
      })
      setSaveError(err.message || 'تعذر حفظ التغييرات')
      setSaveState('error')
      return false
    } finally {
      flushInFlight.current = false
      setSavingIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      if (succeeded && pendingUpdates.current.size > 0) {
        if (flushTimer.current) clearTimeout(flushTimer.current)
        flushTimer.current = setTimeout(() => flushUpdates(), 400)
      }
    }
  }, [])

  const queueUpdate = useCallback((studentId: number, update: { status?: string; notes?: string; sheikh_id?: number }) => {
    const existing = pendingUpdates.current.get(studentId) || {}
    pendingUpdates.current.set(studentId, { ...existing, ...update })
    setSaveState('pending')
    if (flushTimer.current) clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(() => flushUpdates(), 400)
  }, [flushUpdates])

  const handleUpdateStatus = useCallback((studentId: number, newStatus: string) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sheikh_groups: prev.sheikh_groups.map((g) => ({
          ...g,
          students: g.students.map((s) =>
            s.id === studentId ? { ...s, status: newStatus } : s
          ),
        })),
      }
    })
    queueUpdate(studentId, { status: newStatus })
  }, [queueUpdate])

  const handleUpdateNotes = useCallback((studentId: number, notes: string) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sheikh_groups: prev.sheikh_groups.map((group) => ({
          ...group,
          students: group.students.map((student) => student.id === studentId ? { ...student, notes } : student),
        })),
      }
    })
    queueUpdate(studentId, { notes })
  }, [queueUpdate])

  const handleUpdateSheikh = useCallback((studentId: number, sheikhId: number) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sheikh_groups: prev.sheikh_groups.map((g) => ({
          ...g,
          students: g.students.map((s) =>
            s.id === studentId ? { ...s, sheikh_id: sheikhId } : s
          ),
        })),
      }
    })
    queueUpdate(studentId, { sheikh_id: sheikhId })
  }, [queueUpdate])

  const handleSaveDate = async () => {
    if (!data || !editDateVal) return
    try {
      const result = await api.updateSessionDate(data.session_id, editDateVal)
      setData((prev) => prev ? { ...prev, date: result.date, version: result.version } : prev)
      setEditingDate(false)
    } catch (err: any) {
      setSaveError(err.message || 'تعذر تعديل تاريخ الجلسة')
      setSaveState('error')
    }
  }

  const navigateAfterSave = async (href: string) => {
    if (flushTimer.current) clearTimeout(flushTimer.current)
    const saved = await flushUpdates()
    if (saved && pendingUpdates.current.size === 0) router.push(href)
  }

  const handleConfirm = async () => {
    if (!data) return
    try {
      if (flushTimer.current) clearTimeout(flushTimer.current)
      const saved = await flushUpdates()
      if (!saved || pendingUpdates.current.size > 0) return
      const result = await api.confirmSession(data.session_id, dataRef.current?.version ?? data.version)
      setData((current) => current ? { ...current, is_confirmed: true, status: 'confirmed', version: result.version } : current)
    } catch (err: any) {
      setSaveError(err.message || 'تعذر تأكيد الجلسة')
      setSaveState('error')
    }
  }

  const handleReopen = async () => {
    if (!data || reopenReason.trim().length < 3) return
    setReopening(true)
    setSaveError('')
    try {
      const result = await api.reopenSession(data.session_id, reopenReason.trim(), data.version)
      setData((current) => current ? { ...current, is_confirmed: false, status: 'reopened', version: result.version } : current)
      setShowReopen(false)
      setReopenReason('')
    } catch (err: any) {
      setSaveError(err.message || 'تعذر إعادة فتح الجلسة')
      setSaveState('error')
    } finally {
      setReopening(false)
    }
  }

  const saveProgress = async (input: QuranProgressInput) => {
    if (!data) return
    await api.saveSessionProgress(data.session_id, [input])
    const refreshed = await api.getSessionProgress(data.session_id)
    setProgressEntries(refreshed.entries)
  }

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (pendingUpdates.current.size === 0 && !flushInFlight.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeLeave)
      if (flushTimer.current) clearTimeout(flushTimer.current)
    }
  }, [])

  if (loading) return <div className="page-loading" aria-label="جاري التحميل" />

  if (loadError) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p role="alert" className="text-red-600">{loadError}</p>
        <button type="button" onClick={() => window.location.reload()} className="water-btn-outline mt-4 rounded-xl px-4 py-2 text-sm">إعادة المحاولة</button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
        الجلسة غير موجودة
      </div>
    )
  }

  const presentCount = data.sheikh_groups.reduce(
    (acc, g) => acc + g.students.filter((s) => s.status === 'حاضر').length,
    0
  )
  const absentCount = data.sheikh_groups.reduce(
    (acc, g) => acc + g.students.filter((s) => s.status === 'غياب').length,
    0
  )
  const notApplicableCount = data.sheikh_groups.reduce(
    (acc, g) => acc + g.students.filter((s) => s.status === 'لا ينطبق').length,
    0
  )
  const excusedAbsentCount = data.sheikh_groups.reduce(
    (acc, g) => acc + g.students.filter((s) => s.status === 'غياب بعذر').length,
    0
  )
  const totalCount = data.sheikh_groups.reduce((acc, g) => acc + g.students.length, 0)
  const summaryItems = [
    {
      label: 'حاضر',
      value: presentCount,
      suffix: `/ ${totalCount}`,
      className: 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-300',
    },
    {
      label: 'غياب',
      value: absentCount,
      className: 'border-slate-200 bg-slate-50/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    },
    {
      label: 'لا ينطبق',
      value: notApplicableCount,
      className: 'border-sky-200 bg-sky-50/80 text-sky-700 dark:border-sky-800 dark:bg-sky-900/25 dark:text-sky-300',
    },
    {
      label: 'غياب بعذر',
      value: excusedAbsentCount,
      className: 'border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-800 dark:bg-amber-900/25 dark:text-amber-300',
    },
  ]

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
        <div className="min-w-0">
          <div className="flex items-start md:items-center gap-2 md:gap-3">
            <button
              onClick={() => prevSession && navigateAfterSave(`/sessions/${prevSession.id}`)}
              disabled={!prevSession}
              className={`text-xl p-2 rounded-xl transition shrink-0 ${prevSession ? 'hover:bg-water-200/50 text-deep-600 cursor-pointer' : 'text-deep-300/40'}`}
            >
              ‹
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-deep-800">تسجيل الحضور</h1>
              <div className="text-deep-600/60 text-sm mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {editingDate ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={editDateVal}
                      onChange={(e) => setEditDateVal(e.target.value)}
                      className="px-2 py-1 text-xs bg-white/50 dark:bg-slate-800/50 border border-water-300 rounded-xl"
                      autoFocus
                    />
                    <button onClick={handleSaveDate} className="text-xs water-btn text-white px-2 py-1 rounded-lg">حفظ</button>
                    <button onClick={() => setEditingDate(false)} className="text-xs text-deep-400 px-2 py-1">إلغاء</button>
                  </span>
                ) : (
                  <button disabled={data.is_confirmed || (userRole !== 'admin' && userRole !== 'super_admin')} onClick={() => { setEditDateVal(data.date); setEditingDate(true) }} className="hover:text-cyan-600 transition cursor-pointer disabled:cursor-default">
                    {getArabicDay(data.date)} — {data.date}
                  </button>
                )}
                <span>{data.circle_name || 'التحفيظ'}</span>
              </div>
            </div>
            <button
              onClick={() => nextSession && navigateAfterSave(`/sessions/${nextSession.id}`)}
              disabled={!nextSession}
              className={`text-xl p-2 rounded-xl transition shrink-0 ${nextSession ? 'hover:bg-water-200/50 text-deep-600 cursor-pointer' : 'text-deep-300/40'}`}
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => navigateAfterSave('/sessions')}
            className="water-btn-outline px-4 py-2 rounded-xl text-sm flex-1 md:flex-none"
          >
            رجوع
          </button>
          {!data.is_confirmed && (userRole === 'admin' || userRole === 'super_admin') && (
            <button
              onClick={handleConfirm}
              disabled={saveState === 'saving'}
              className="water-btn text-white px-4 py-2 rounded-xl text-sm font-medium flex-1 md:flex-none"
            >
              تأكيد الجلسة
            </button>
          )}
          {data.is_confirmed && (userRole === 'admin' || userRole === 'super_admin') && (
            <button type="button" onClick={() => setShowReopen(true)} className="water-btn-outline px-4 py-2 rounded-xl text-sm flex-1 md:flex-none">
              إعادة فتح الجلسة
            </button>
          )}
        </div>
      </div>

      <div aria-live="polite" className="mb-4 min-h-6 text-center text-sm">
        {saveState === 'pending' && <span className="text-amber-600">تغييرات بانتظار الحفظ...</span>}
        {saveState === 'saving' && <span className="text-cyan-700">جاري حفظ التغييرات...</span>}
        {saveState === 'saved' && <span className="text-emerald-600">تم حفظ جميع التغييرات</span>}
        {saveState === 'error' && (
          <span className="text-red-600">
            {saveError}
            <button type="button" onClick={() => flushUpdates()} className="mr-2 underline font-semibold">إعادة المحاولة</button>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        {summaryItems.map((item) => (
          <div key={item.label} className={`rounded-lg border px-3 py-2.5 ${item.className}`}>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-xl font-bold leading-none">{item.value}</span>
              {item.suffix && <span className="text-xs opacity-70">{item.suffix}</span>}
            </div>
            <div className="mt-1 text-center text-xs font-semibold">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-start mb-2">
        <button
          onClick={() => setExpandedSheikhs(allExpanded ? new Set() : new Set(data.sheikh_groups.map((g) => g.sheikh.id)))}
          className="text-xs text-cyan-700 dark:text-cyan-400 hover:underline px-2 py-1 transition"
        >
          {allExpanded ? 'طي الكل' : 'فتح الكل'}
        </button>
      </div>
      <div className="space-y-3">
        {data.sheikh_groups.map((group) => (
          <SheikhAccordion
            key={group.sheikh.id}
            group={group}
            circleSheikhs={data.circle_sheikhs}
            onUpdateStatus={handleUpdateStatus}
            onUpdateNotes={handleUpdateNotes}
            onUpdateSheikh={handleUpdateSheikh}
            onZoomPic={(url) => setPreviewPic(url)}
            savingIds={savingIds}
            expanded={expandedSheikhs.has(group.sheikh.id)}
            onToggle={() => toggleSheikh(group.sheikh.id)}
            disabled={data.is_confirmed}
          />
        ))}
      </div>

      {data.is_confirmed && (
        <div className="mt-6 glass-strong text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
          تم تأكيد هذه الجلسة
        </div>
      )}

      {progressEnabled && (
        <QuranProgressEditor
          students={data.sheikh_groups.flatMap((group) => group.students.map((student) => ({
            id: student.id,
            name: student.name,
            sheikh_id: student.sheikh_id,
          })))}
          entries={progressEntries}
          disabled={data.is_confirmed}
          onSave={saveProgress}
        />
      )}

      {showReopen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reopen-title" onClick={() => setShowReopen(false)}>
          <div className="glass-strong w-full max-w-md rounded-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <h2 id="reopen-title" className="text-xl font-bold text-deep-800">إعادة فتح الجلسة</h2>
            <p className="mt-2 text-sm text-deep-500">سيتم السماح بتعديل الحضور والمتابعة، وسيُحفظ السبب في سجل التدقيق.</p>
            <textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} rows={3} autoFocus className="surface-field mt-4 w-full rounded-xl px-4 py-3 text-sm" placeholder="سبب إعادة الفتح" />
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setShowReopen(false)} className="water-btn-outline flex-1 rounded-xl px-4 py-2">إلغاء</button>
              <button type="button" onClick={handleReopen} disabled={reopening || reopenReason.trim().length < 3} className="water-btn flex-1 rounded-xl px-4 py-2 text-white disabled:opacity-50">{reopening ? 'جاري...' : 'إعادة الفتح'}</button>
            </div>
          </div>
        </div>
      )}

      {previewPic && <ImagePreviewModal src={previewPic} onClose={() => setPreviewPic(null)} />}
    </div>
  )
}

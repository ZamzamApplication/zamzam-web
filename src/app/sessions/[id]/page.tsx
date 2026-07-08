'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getArabicDay, mediaUrl } from '@/lib/format'
import type { Session, SessionAttendance, SheikhGroup } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  'غياب': 'status-badge bg-gray-100/50 text-gray-600 border-gray-200 dark:bg-gray-700/40 dark:text-gray-400 dark:border-gray-700',
  'حاضر': 'status-badge bg-green-100/60 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
  'غياب بعذر': 'status-badge bg-yellow-100/60 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  'لا ينطبق': 'status-badge bg-blue-100/60 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
}

function useDebounce(callback: (...args: any[]) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback((...args: any[]) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => callback(...args), delay)
  }, [callback, delay])
}

function StudentRow({
  student,
  circleSheikhs,
  onStatusChange,
  onNotesChange,
  onSheikhChange,
  onZoomPic,
  saving,
}: {
  student: { id: number; name: string; status: string; notes?: string; sheikh_id: number | null; profile_pic?: string | null }
  circleSheikhs: { id: number; name: string }[]
  onStatusChange: (status: string) => void
  onNotesChange: (notes: string) => void
  onSheikhChange: (sheikhId: number) => void
  onZoomPic: (url: string) => void
  saving: boolean
}) {
  const [notes, setNotes] = useState(student.notes || '')
  const debouncedSave = useDebounce(onNotesChange, 600)

  const handleNotesChange = (value: string) => {
    setNotes(value)
    debouncedSave(value)
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
  const [expandedSheikhs, setExpandedSheikhs] = useState<Set<number>>(new Set())
  const [userRole, setUserRole] = useState<string>('')
  const [previewPic, setPreviewPic] = useState<string | null>(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      setUserRole(u.role || '')
    } catch { /* ignore */ }
  }, [])

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
    Promise.all([
      api.getSessionAttendance(Number(params.id)),
      api.getAllSessions(),
    ]).then(([sessionData, sessions]) => {
      setData(sessionData)
      setAllSessions(sessions)
    }).catch(console.error)
      .finally(() => setLoading(false))
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

  function getStudentStatus(sessionData: SessionAttendance, studentId: number): string {
    for (const g of sessionData.sheikh_groups) {
      const s = g.students.find((st) => st.id === studentId)
      if (s) return s.status
    }
    return 'غياب'
  }

  const flushUpdates = useCallback(async () => {
    const updates = pendingUpdates.current
    if (updates.size === 0) return

    pendingUpdates.current = new Map()
    const ids = new Set(updates.keys())
    setSavingIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })

    try {
      const promises: Promise<any>[] = []
      updates.forEach((update, studentId) => {
        if (!data) return
        const sheikhId = update.sheikh_id !== undefined ? update.sheikh_id : undefined
        const status = update.status !== undefined ? update.status : getStudentStatus(data, studentId)
        promises.push(api.upsertAttendance(data.session_id, studentId, status, update.notes, sheikhId))
      })
      await Promise.all(promises)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    }
  }, [data])

  const queueUpdate = useCallback((studentId: number, update: { status?: string; notes?: string; sheikh_id?: number }) => {
    const existing = pendingUpdates.current.get(studentId) || {}
    pendingUpdates.current.set(studentId, { ...existing, ...update })
    if (flushTimer.current) clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(flushUpdates, 50)
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
      setData((prev) => prev ? { ...prev, date: result.date } : prev)
      setEditingDate(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleConfirm = async () => {
    if (!data) return
    try {
      await api.confirmSession(data.session_id)
      router.push('/')
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return null

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
  const totalCount = data.sheikh_groups.reduce((acc, g) => acc + g.students.length, 0)
  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
        <div className="min-w-0">
          <div className="flex items-start md:items-center gap-2 md:gap-3">
            <button
              onClick={() => prevSession && router.push(`/sessions/${prevSession.id}`)}
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
                  <button onClick={() => { setEditDateVal(data.date); setEditingDate(true) }} className="hover:text-cyan-600 transition cursor-pointer">
                    {getArabicDay(data.date)} — {data.date}
                  </button>
                )}
                <span>{data.circle_name || `حلقة #${data.circle_id}`}</span>
                <span>{presentCount}/{totalCount} حاضر</span>
              </div>
            </div>
            <button
              onClick={() => nextSession && router.push(`/sessions/${nextSession.id}`)}
              disabled={!nextSession}
              className={`text-xl p-2 rounded-xl transition shrink-0 ${nextSession ? 'hover:bg-water-200/50 text-deep-600 cursor-pointer' : 'text-deep-300/40'}`}
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => router.push('/sessions')}
            className="water-btn-outline px-4 py-2 rounded-xl text-sm flex-1 md:flex-none"
          >
            رجوع
          </button>
          {!data.is_confirmed && userRole === 'admin' && (
            <button
              onClick={handleConfirm}
              className="water-btn text-white px-4 py-2 rounded-xl text-sm font-medium flex-1 md:flex-none"
            >
              تأكيد الجلسة
            </button>
          )}
        </div>
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
          />
        ))}
      </div>

      {data.is_confirmed && (
        <div className="mt-6 glass-strong text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
          تم تأكيد هذه الجلسة
        </div>
      )}

      {previewPic && <ImagePreviewModal src={previewPic} onClose={() => setPreviewPic(null)} />}
    </div>
  )
}

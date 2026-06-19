'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { SessionAttendance, SheikhGroup } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  'غياب': 'status-badge bg-gray-100/50 text-gray-600 border-gray-200 dark:bg-gray-700/40 dark:text-gray-400 dark:border-gray-700',
  'حاضر': 'status-badge bg-green-100/60 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
  'غياب بعذر': 'status-badge bg-yellow-100/60 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  'لا ينطبق': 'status-badge bg-blue-100/60 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
}

const STATUS_ORDER = ['غياب', 'حاضر', 'غياب بعذر', 'لا ينطبق']

function cycleStatus(current: string): string {
  const idx = STATUS_ORDER.indexOf(current)
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
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
  onToggle,
  onNotesChange,
  onSheikhChange,
  saving,
}: {
  student: { id: number; name: string; status: string; notes?: string; sheikh_id: number | null }
  circleSheikhs: { id: number; name: string }[]
  onToggle: () => void
  onNotesChange: (notes: string) => void
  onSheikhChange: (sheikhId: number) => void
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
    <div className="flex items-center gap-3 py-2.5 px-4 hover:bg-water-100/30 rounded-xl transition">
      <span className="font-medium text-deep-800 min-w-[100px]">{student.name}</span>
      <button
        onClick={onToggle}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${STATUS_STYLES[student.status] || STATUS_STYLES['غياب']} ${saving ? 'opacity-60' : ''}`}
      >
        {student.status}
      </button>
      <select
        value={student.sheikh_id ?? ''}
        onChange={(e) => onSheikhChange(Number(e.target.value))}
        className="px-2 py-1.5 text-xs bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
      >
        {circleSheikhs.map((sh) => (
          <option key={sh.id} value={sh.id}>{sh.name}</option>
        ))}
      </select>
      <input
        value={notes}
        onChange={(e) => handleNotesChange(e.target.value)}
        placeholder="ملاحظات..."
        className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
      />
    </div>
  )
}

function SheikhAccordion({
  group,
  circleSheikhs,
  onUpdateStatus,
  onUpdateNotes,
  onUpdateSheikh,
  savingIds,
}: {
  group: SheikhGroup
  circleSheikhs: { id: number; name: string }[]
  onUpdateStatus: (studentId: number, newStatus: string) => void
  onUpdateNotes: (studentId: number, notes: string) => void
  onUpdateSheikh: (studentId: number, sheikhId: number) => void
  savingIds: Set<number>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-water-100/30 hover:bg-water-200/30 transition"
      >
        <span className="text-lg font-bold text-deep-800">{group.sheikh.name}</span>
        <span className="text-deep-500 text-sm">
          {group.students.filter((s) => s.status !== 'غياب').length}/{group.students.length}
        </span>
      </button>

      {open && (
        <div className="divide-y divide-water-200/30">
          {group.students.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              circleSheikhs={circleSheikhs}
              onToggle={() => onUpdateStatus(student.id, cycleStatus(student.status))}
              onNotesChange={(notes) => onUpdateNotes(student.id, notes)}
              onSheikhChange={(sheikhId) => onUpdateSheikh(student.id, sheikhId)}
              saving={savingIds.has(student.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SessionAttendancePage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<SessionAttendance | null>(null)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [editingDate, setEditingDate] = useState(false)
  const [editDateVal, setEditDateVal] = useState('')
  const pendingUpdates = useRef<Map<number, { status?: string; notes?: string; sheikh_id?: number }>>(new Map())
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.getSessionAttendance(Number(params.id))
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [params.id])

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
        promises.push(api.upsertAttendance(data.session_id, studentId, update.status || 'غياب', update.notes, sheikhId))
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

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(flushUpdates, 400)
  }, [flushUpdates])

  const queueUpdate = useCallback((studentId: number, update: { status?: string; notes?: string; sheikh_id?: number }) => {
    const existing = pendingUpdates.current.get(studentId) || {}
    pendingUpdates.current.set(studentId, { ...existing, ...update })
    scheduleFlush()
  }, [scheduleFlush])

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-deep-800">تسجيل الحضور</h1>
          <p className="text-deep-600/60 text-sm mt-1">
            {editingDate ? (
              <span className="inline-flex items-center gap-2">
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
                {data.date}
              </button>
            )}
            {' — '}{data.circle_name || `حلقة #${data.circle_id}`} — {presentCount}/{totalCount} حاضر
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/sessions')}
            className="water-btn-outline px-4 py-2 rounded-xl text-sm"
          >
            رجوع
          </button>
          {!data.is_confirmed && (
            <button
              onClick={handleConfirm}
              className="water-btn text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              تأكيد الجلسة
            </button>
          )}
        </div>
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
            savingIds={savingIds}
          />
        ))}
      </div>

      {data.is_confirmed && (
        <div className="mt-6 glass-strong text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
          تم تأكيد هذه الجلسة
        </div>
      )}
    </div>
  )
}

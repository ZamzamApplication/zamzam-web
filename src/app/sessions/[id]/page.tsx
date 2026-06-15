'use client'

import { useEffect, useState } from 'react'
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

function StudentRow({
  student,
  onToggle,
}: {
  student: { id: number; name: string; status: string }
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 hover:bg-water-100/30 rounded-xl transition">
      <span className="font-medium text-deep-800">{student.name}</span>
      <button
        onClick={onToggle}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${STATUS_STYLES[student.status] || STATUS_STYLES['غياب']}`}
      >
        {student.status}
      </button>
    </div>
  )
}

function SheikhAccordion({
  group,
  onUpdate,
}: {
  group: SheikhGroup
  onUpdate: (studentId: number, newStatus: string) => void
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
              onToggle={() => onUpdate(student.id, cycleStatus(student.status))}
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
  const [saving, setSaving] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getSessionAttendance(Number(params.id))
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [params.id])

  const handleUpdate = async (studentId: number, newStatus: string) => {
    if (!data) return
    setSaving((prev) => new Set(prev).add(studentId))
    try {
      await api.upsertAttendance(data.session_id, studentId, newStatus)
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
    } catch (err) {
      console.error(err)
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(studentId)
        return next
      })
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
            {data.date} — {data.circle_name || `حلقة #${data.circle_id}`} — {presentCount}/{totalCount} حاضر
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
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      {data.is_confirmed && (
        <div className="mt-6 glass-strong text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
          تم تأكيد هذه الجلسة ✅
        </div>
      )}
    </div>
  )
}

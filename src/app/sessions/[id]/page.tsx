'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { SessionAttendance, SheikhGroup, StudentAttendance } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  'غياب': 'bg-gray-100 text-gray-600 border-gray-300',
  'حاضر': 'bg-green-100 text-green-700 border-green-400',
  'غياب بعذر': 'bg-yellow-100 text-yellow-700 border-yellow-400',
}

const STATUS_ORDER = ['غياب', 'حاضر', 'غياب بعذر']

function cycleStatus(current: string): string {
  const idx = STATUS_ORDER.indexOf(current)
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
}

function StudentRow({
  student,
  onToggle,
}: {
  student: StudentAttendance
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between py-2 px-4 hover:bg-aqua-50 rounded-lg transition">
      <span className="font-medium text-gray-800">{student.name}</span>
      <button
        onClick={onToggle}
        className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition ${STATUS_COLORS[student.status] || STATUS_COLORS['غياب']}`}
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
    <div className="bg-white rounded-xl shadow-sm border border-aqua-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-aqua-50 hover:bg-aqua-100 transition"
      >
        <span className="text-lg font-bold text-aqua-800">{group.sheikh.name}</span>
        <span className="text-aqua-600 text-sm">
          {group.students.filter((s) => s.status !== 'غياب').length}/{group.students.length}
        </span>
      </button>

      {open && (
        <div className="divide-y divide-aqua-50">
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
    return <div className="text-center text-gray-500 py-12">الجلسة غير موجودة</div>
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
          <h1 className="text-2xl font-bold text-aqua-800">تسجيل الحضور</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data.date} — {presentCount}/{totalCount} حاضر
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/sessions')}
            className="px-4 py-2 border border-aqua-300 text-aqua-700 rounded-lg hover:bg-aqua-50 transition text-sm"
          >
            رجوع
          </button>
          {!data.is_confirmed && (
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-aqua-600 text-white rounded-lg hover:bg-aqua-700 transition text-sm font-medium"
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
        <div className="mt-6 bg-green-50 text-green-700 border border-green-200 rounded-xl p-4 text-center">
          تم تأكيد هذه الجلسة ✅
        </div>
      )}
    </div>
  )
}

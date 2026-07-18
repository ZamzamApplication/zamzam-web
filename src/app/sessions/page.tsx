'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatDateWithWeekday } from '@/lib/format'
import type { Session } from '@/lib/types'
import CreateSessionModal from '@/components/CreateSessionModal'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const router = useRouter()

  const load = useCallback(async () => {
    try {
      const data = filter === 'all' ? await api.getAllSessions()
        : filter === 'past' ? await api.getPastSessions()
        : await api.getUpcomingSessions()
      setSessions(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
    try {
      const role = JSON.parse(localStorage.getItem('user') || '{}').role
      setCanManage(role === 'admin' || role === 'super_admin')
    } catch {}
  }, [load])

  const handleCreated = (sessionId: number) => {
    setShowModal(false)
    router.push(`/sessions/${sessionId}`)
  }

  if (loading) return <div className="page-loading" aria-label="جاري التحميل" />

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-deep-800">الجلسات</h1>
        {canManage && <button
          onClick={() => setShowModal(true)}
          className="water-btn text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
        >
          + إضافة جلسة
        </button>}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5 p-1 rounded-xl bg-water-100/35">
        {[
          { key: 'upcoming', label: 'غير مؤكدة' },
          { key: 'past', label: 'مؤكدة' },
          { key: 'all', label: 'الكل' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key as typeof filter); setLoading(true) }}
            className={`px-2 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key ? 'water-btn text-white' : 'water-btn-outline'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
          <div className="text-4xl mb-3">💧</div>
          لا توجد جلسات
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="glass-card rounded-xl p-4 sm:p-5 cursor-pointer block"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg text-deep-800 leading-7">جلسة {formatDateWithWeekday(s.date)}</h3>
                  {s.circle_name && <p className="text-xs text-deep-500 mt-0.5">{s.circle_name}</p>}
                </div>
                <div className="flex flex-col-reverse sm:flex-row items-end sm:items-center gap-2 shrink-0">
                  {canManage && <button
                    onClick={async (e) => {
                      e.preventDefault()
                      if (!confirm('حذف الجلسة وجميع سجلات الحضور المرتبطة بها؟')) return
                      await api.deleteSession(s.id)
                      load()
                    }}
                    className="min-h-[2rem] px-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition"
                  >
                    حذف
                  </button>}
                  <span className={`status-badge px-3 py-1 rounded-full text-xs ${
                    s.is_confirmed ? 'bg-green-100/60 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700' : 'bg-yellow-100/60 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700'
                  }`}>
                    {s.is_confirmed ? 'مؤكدة' : 'قيد الانتظار'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <CreateSessionModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}

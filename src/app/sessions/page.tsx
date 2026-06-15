'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Session } from '@/lib/types'
import CreateSessionModal from '@/components/CreateSessionModal'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
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

  useEffect(() => { load() }, [load])

  const handleCreated = (sessionId: number) => {
    setShowModal(false)
    router.push(`/sessions/${sessionId}`)
  }

  if (loading) return null

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-deep-800">الجلسات</h1>
        <button
          onClick={() => setShowModal(true)}
          className="water-btn text-white px-4 py-2 rounded-xl text-sm"
        >
          + إضافة جلسة
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { key: 'upcoming', label: 'غير مؤكدة' },
          { key: 'past', label: 'مؤكدة' },
          { key: 'all', label: 'الكل' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key as typeof filter); setLoading(true) }}
            className={`px-4 py-1.5 rounded-xl text-sm transition ${
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
            <div
              key={s.id}
              onClick={() => router.push(`/sessions/${s.id}`)}
              className="glass-card rounded-2xl p-5 cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg text-deep-800">جلسة {s.date}</h3>
                  {s.circle_name && <p className="text-xs text-deep-500 mt-0.5">{s.circle_name}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (!confirm('حذف الجلسة وجميع سجلات الحضور المرتبطة بها؟')) return
                      await api.deleteSession(s.id)
                      load()
                    }}
                    className="text-xs text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition"
                  >
                    حذف
                  </button>
                  <span className={`status-badge px-3 py-1 rounded-full text-xs ${
                    s.is_confirmed ? 'bg-green-100/60 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700' : 'bg-yellow-100/60 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700'
                  }`}>
                    {s.is_confirmed ? 'مؤكدة' : 'قيد الانتظار'}
                  </span>
                </div>
              </div>
            </div>
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

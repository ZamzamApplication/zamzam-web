'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Session } from '@/lib/types'
import CreateSessionModal from '@/components/CreateSessionModal'

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const load = useCallback(() => {
    api.getUpcomingSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreated = (sessionId: number) => {
    setShowModal(false)
    router.push(`/sessions/${sessionId}`)
  }

  if (loading) return null

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-deep-800">الجلسات القادمة</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="water-btn text-white px-4 py-2 rounded-xl text-sm"
          >
            + إضافة جلسة
          </button>
          <Link href="/sessions" className="water-btn-outline px-4 py-2 rounded-xl text-sm">
            عرض الكل
          </Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
          <div className="text-4xl mb-3">💧</div>
          لا توجد جلسات قادمة
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
                <span className={`status-badge px-3 py-1 rounded-full text-xs ${
                  s.is_confirmed ? 'bg-green-100/60 text-green-700 border-green-300' : 'bg-yellow-100/60 text-yellow-700 border-yellow-300'
                }`}>
                  {s.is_confirmed ? 'مؤكدة' : 'قيد الانتظار'}
                </span>
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

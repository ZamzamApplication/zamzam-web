'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Session } from '@/lib/types'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    api.getUpcomingSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-aqua-800 mb-6">الجلسات غير المؤكدة</h1>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500 border border-aqua-100">
          لا توجد جلسات قادمة
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/sessions/${s.id}`)}
              className="bg-white rounded-xl shadow-md p-5 border border-aqua-100 hover:shadow-lg hover:border-aqua-300 transition cursor-pointer"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg text-aqua-800">{s.circle_name}</h3>
                  <p className="text-gray-500 text-sm">{s.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-aqua-600 text-sm">تسجيل الحضور ←</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

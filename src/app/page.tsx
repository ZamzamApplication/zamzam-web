'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Session } from '@/lib/types'

export default function Home() {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-aqua-800">الجلسات القادمة</h1>
        <Link href="/sessions" className="bg-aqua-600 text-white px-4 py-2 rounded-lg hover:bg-aqua-700 transition text-sm">
          عرض الكل
        </Link>
      </div>

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
                <span className={`px-3 py-1 rounded-full text-xs ${
                  s.is_confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {s.is_confirmed ? 'مؤكدة' : 'قيد الانتظار'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

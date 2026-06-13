'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Session } from '@/lib/types'
import CreateSessionModal from '@/components/CreateSessionModal'

interface Stats {
  circles: number
  sheikhs: number
  students: number
  sessions: number
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<Stats>({ circles: 0, sheikhs: 0, students: 0, sessions: 0 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    try {
      const [sessionsData, circlesData] = await Promise.all([
        api.getUpcomingSessions(),
        api.getCircles(),
      ])
      setSessions(sessionsData)

      const sheikhs = await api.getSheikhs()
      const allSessions = await api.getAllSessions()
      const studentsCount = (await Promise.all(
        sheikhs.map((s: any) => api.getSheikhStudents(s.id))
      )).reduce((acc: number, arr: any[]) => acc + arr.length, 0)

      setStats({
        circles: circlesData.length,
        sheikhs: sheikhs.length,
        students: studentsCount,
        sessions: allSessions.length,
      })
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreated = (sessionId: number) => {
    setShowModal(false)
    router.push(`/sessions/${sessionId}`)
  }

  if (loading) return null

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-10 pt-4">
        <div className="text-5xl mb-4">💧</div>
        <h1 className="text-3xl font-bold text-deep-900 mb-2">دار زمزم لتحفيظ القرآن</h1>
        <p className="text-deep-500 max-w-md mx-auto">
          منصة متابعة حضور حلقات تحفيظ القرآن الكريم — إدارة الجلسات، تسجيل الحضور، والتقارير
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'الحلقات', value: stats.circles, href: '/manage', color: 'from-cyan-400 to-blue-500' },
          { label: 'الشيوخ', value: stats.sheikhs, href: '/manage', color: 'from-emerald-400 to-teal-500' },
          { label: 'الطلاب', value: stats.students, href: '/manage', color: 'from-violet-400 to-purple-500' },
          { label: 'الجلسات', value: stats.sessions, href: '/sessions', color: 'from-amber-400 to-orange-500' },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`glass-card rounded-2xl p-5 text-center bg-gradient-to-br ${item.color} text-white hover:brightness-110 transition-all`}
          >
            <div className="text-3xl font-bold">{item.value}</div>
            <div className="text-sm mt-1 opacity-80">{item.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8 justify-center">
        <button onClick={() => setShowModal(true)} className="water-btn text-white px-5 py-2.5 rounded-xl text-sm font-medium">
          ＋ إضافة جلسة جديدة
        </button>
        <Link href="/attendance" className="water-btn-outline px-5 py-2.5 rounded-xl text-sm font-medium">
          سجل الحضور
        </Link>
        <Link href="/reports" className="water-btn-outline px-5 py-2.5 rounded-xl text-sm font-medium">
          التقارير
        </Link>
        <Link href="/manage" className="water-btn-outline px-5 py-2.5 rounded-xl text-sm font-medium">
          الإدارة
        </Link>
      </div>

      {/* Upcoming Sessions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-deep-800">الجلسات القادمة</h2>
        <Link href="/sessions" className="text-sm text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 transition">عرض الكل ←</Link>
      </div>

      {sessions.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
          <div className="text-4xl mb-3">💧</div>
          لا توجد جلسات قادمة
        </div>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/sessions/${s.id}`)}
              className="glass-card rounded-2xl p-5 cursor-pointer hover:bg-water-100/30 transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-deep-800">جلسة {s.date}</h3>
                  {s.circle_name && <p className="text-xs text-deep-500 mt-0.5">{s.circle_name}</p>}
                </div>
                <span className={`status-badge px-3 py-1 rounded-full text-xs ${
                  s.is_confirmed ? 'bg-green-100/60 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700' : 'bg-yellow-100/60 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700'
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

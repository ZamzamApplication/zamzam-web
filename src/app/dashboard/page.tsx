'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatDateWithWeekday } from '@/lib/format'
import type { Session } from '@/lib/types'
import CreateSessionModal from '@/components/CreateSessionModal'

interface Stats {
  sheikhs: number
  students: number
  sessions: number
  confirmedSessions: number
  pendingSessions: number
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysFromToday(dateStr: string): number {
  const today = new Date(`${toLocalDateString(new Date())}T12:00:00`)
  const target = new Date(`${dateStr}T12:00:00`)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function sessionTimingLabel(dateStr: string): string {
  const days = daysFromToday(dateStr)
  if (days === 0) return 'اليوم'
  if (days === 1) return 'غدا'
  if (days === -1) return 'أمس'
  if (days > 1) return `بعد ${days} أيام`
  return `متأخرة ${Math.abs(days)} أيام`
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<Stats>({
    sheikhs: 0,
    students: 0,
    sessions: 0,
    confirmedSessions: 0,
    pendingSessions: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    try {
      const [sessionsData, summary] = await Promise.all([
        api.getUpcomingSessions(),
        api.getDashboardSummary(),
      ])
      setSessions(sessionsData)
      setStats({
        sheikhs: summary.sheikhs,
        students: summary.students,
        sessions: summary.sessions,
        confirmedSessions: summary.confirmed_sessions,
        pendingSessions: summary.pending_sessions,
      })
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

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

  const nextSession = sessions[0]
  const visibleSessions = sessions.slice(0, 5)
  const completionRate = stats.sessions > 0 ? Math.round((stats.confirmedSessions / stats.sessions) * 100) : 0

  const metricCards = [
    { label: 'الطلاب', value: stats.students, href: '/manage', accent: 'bg-cyan-500', detail: 'طالب مقيد في التحفيظ' },
    { label: 'الشيوخ', value: stats.sheikhs, href: '/manage', accent: 'bg-emerald-500', detail: 'شيخ مسؤول عن المتابعة' },
    { label: 'الجلسات', value: stats.sessions, href: '/sessions', accent: 'bg-amber-500', detail: `${stats.pendingSessions} جلسة قيد الانتظار` },
    { label: 'الحضور المؤكد', value: stats.confirmedSessions, href: '/attendance', accent: 'bg-indigo-500', detail: 'جلسة مكتملة في سجل الحضور' },
  ]

  const actionCards = [
    { title: 'تسجيل الحضور', desc: 'راجع سجل الحضور والتصفيات المحفوظة', href: '/attendance' },
    { title: 'إدارة الطلاب', desc: 'الشيوخ والطلاب والمستخدمون', href: '/manage' },
    { title: 'التقارير', desc: 'نسب الحضور وأداء الطلاب في التحفيظ', href: '/reports' },
  ]

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
        <div className="glass-card rounded-lg p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 mb-2">لوحة المتابعة</p>
              <h1 className="text-2xl md:text-3xl font-bold text-deep-900">زمزم لتحفيظ القرآن</h1>
              <p className="text-deep-500 text-sm mt-2 max-w-2xl">
                نظرة سريعة على التحفيظ والجلسات غير المؤكدة، مع وصول مباشر لأهم مهام اليوم.
              </p>
            </div>
            {canManage && <button onClick={() => setShowModal(true)} className="water-btn text-white px-5 py-2.5 rounded-lg text-sm font-semibold self-start">
              إضافة جلسة جديدة
            </button>}
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            <div className="rounded-lg border border-water-200/70 bg-white/60 dark:bg-slate-800/60 p-4">
              <p className="text-xs text-deep-500 mb-1">الجلسات المؤكدة</p>
              <p className="text-2xl font-bold text-deep-900">{stats.confirmedSessions}</p>
            </div>
            <div className="rounded-lg border border-water-200/70 bg-white/60 dark:bg-slate-800/60 p-4">
              <p className="text-xs text-deep-500 mb-1">قيد الانتظار</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-300">{stats.pendingSessions}</p>
            </div>
            <div className="rounded-lg border border-water-200/70 bg-white/60 dark:bg-slate-800/60 p-4">
              <p className="text-xs text-deep-500 mb-1">نسبة الإغلاق</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">{completionRate}%</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-lg p-5 md:p-6">
          <p className="text-sm font-bold text-deep-800 mb-4">أقرب جلسة</p>
          {nextSession ? (
            <button
              onClick={() => router.push(`/sessions/${nextSession.id}`)}
              className="w-full text-right rounded-lg border border-water-200/80 bg-white/65 dark:bg-slate-800/60 p-4 hover:border-water-400"
            >
              <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 mb-3">
                {sessionTimingLabel(nextSession.date)}
              </span>
              <h2 className="text-lg font-bold text-deep-900">جلسة {formatDateWithWeekday(nextSession.date)}</h2>
              <p className="text-sm text-deep-500 mt-1">{nextSession.circle_name || 'زمزم'}</p>
            </button>
          ) : (
            <div className="rounded-lg border border-dashed border-water-300/80 p-5 text-center text-deep-500 text-sm">
              لا توجد جلسات قيد الانتظار
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((item) => (
          <Link key={item.label} href={item.href} className="glass-card rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-deep-600">{item.label}</p>
                <p className="text-3xl font-bold text-deep-900 mt-1">{item.value}</p>
              </div>
              <span className={`w-2.5 h-10 rounded-full ${item.accent}`} />
            </div>
            <p className="text-xs text-deep-500 mt-3 leading-5">{item.detail}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="glass-card rounded-lg p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-deep-800">المهام السريعة</h2>
            <span className="text-xs text-deep-500">إجراءات متكررة</span>
          </div>
          <div className="space-y-3">
            {actionCards.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg border border-water-200/70 bg-white/55 dark:bg-slate-800/55 p-4 hover:border-water-400"
              >
                <span className="text-sm font-bold text-deep-900">{item.title}</span>
                <span className="block text-xs text-deep-500 mt-1 leading-5">{item.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-lg p-5">
          <div className="flex justify-between items-center gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-deep-800">الجلسات قيد الانتظار</h2>
              <p className="text-xs text-deep-500 mt-1">آخر الجلسات التي تحتاج متابعة أو تأكيد</p>
            </div>
            <Link href="/sessions" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900 dark:text-cyan-300 dark:hover:text-cyan-200 transition">
              عرض الكل
            </Link>
          </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-water-300/80 p-8 text-center text-deep-600/70">
          لا توجد جلسات قيد الانتظار
        </div>
      ) : (
        <div className="divide-y divide-water-200/50">
          {visibleSessions.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/sessions/${s.id}`)}
              className="cursor-pointer py-3 first:pt-0 last:pb-0"
            >
              <div className="flex justify-between items-center gap-4 rounded-lg px-2 py-2 hover:bg-water-50/80 dark:hover:bg-slate-800/70">
                <div className="min-w-0">
                  <h3 className="font-semibold text-deep-800">جلسة {formatDateWithWeekday(s.date)}</h3>
                  {s.circle_name && <p className="text-xs text-deep-500 mt-0.5">{s.circle_name}</p>}
                </div>
                <span className="status-badge shrink-0 px-3 py-1 rounded-lg text-xs bg-yellow-100/70 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700">
                  {sessionTimingLabel(s.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </section>

      {showModal && (
        <CreateSessionModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}

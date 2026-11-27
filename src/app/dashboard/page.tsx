'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, request } from '@/lib/api'
import { formatDateWithWeekday } from '@/lib/format'
import type { Session } from '@/lib/types'
import { canManageTahfiz, useCurrentUser } from '@/lib/current-user'
import CreateSessionModal from '@/components/CreateSessionModal'
import AsyncState from '@/components/AsyncState'
import Badge from '@/components/Badge'
import Icon, { type IconName } from '@/components/Icon'

interface Summary {
  sheikhs: number
  students: number
  sessions: number
  confirmed_sessions: number
  pending_sessions: number
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

/** Arabic count agreement for "days": يوم، يومين، 3–10 أيام، 11+ يومًا. */
function arabicDays(count: number): string {
  if (count === 1) return 'يوم'
  if (count === 2) return 'يومين'
  if (count >= 3 && count <= 10) return `${count} أيام`
  return `${count} يومًا`
}

function sessionTimingLabel(dateStr: string): string {
  const days = daysFromToday(dateStr)
  if (days === 0) return 'اليوم'
  if (days === 1) return 'غدًا'
  if (days === -1) return 'أمس'
  if (days > 1) return `بعد ${arabicDays(days)}`
  return `متأخرة ${arabicDays(Math.abs(days))}`
}

function SessionLine({ session, tone, action }: { session: Session; tone: 'today' | 'overdue' | 'upcoming'; action: string }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-water-200/70 bg-white/60 px-4 py-3 transition hover:border-water-400 dark:bg-slate-800/60"
    >
      <span className="min-w-0">
        <span className="block whitespace-nowrap font-bold text-deep-900">{formatDateWithWeekday(session.date)}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-deep-500">
          {session.circle_name && <span>{session.circle_name}</span>}
          {session.student_count != null && <span>{session.student_count} طالب</span>}
          {tone !== 'today' && <Badge tone={tone === 'overdue' ? 'warning' : 'info'}>{sessionTimingLabel(session.date)}</Badge>}
        </span>
      </span>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold ${tone === 'today' ? 'water-btn text-white' : 'text-blue-700 dark:text-blue-300'}`}>
        {action}
        <Icon name="chevron-next" className="h-4 w-4" />
      </span>
    </Link>
  )
}

function StatTile({ label, value, href, icon }: { label: string; value: number | string; href?: string; icon: IconName }) {
  const body = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-water-100 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300"><Icon name={icon} /></span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-tight text-deep-900">{value}</span>
        <span className="block text-xs font-semibold text-deep-500">{label}</span>
      </span>
    </>
  )
  return href
    ? <Link href={href} className="glass-card flex items-center gap-3 rounded-2xl p-4">{body}</Link>
    : <div className="glass-card flex items-center gap-3 rounded-2xl p-4">{body}</div>
}

export default function DashboardPage() {
  const user = useCurrentUser()
  const canManage = canManageTahfiz(user)
  const [sessions, setSessions] = useState<Session[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [pendingRegistrations, setPendingRegistrations] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const tahfizName = (typeof window !== 'undefined' && localStorage.getItem('support_tahfiz_name')) || user?.tahfiz?.name || 'التحفيظ'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [sessionsData, summaryData] = await Promise.all([
        api.getUpcomingSessions(),
        api.getDashboardSummary() as Promise<Summary>,
      ])
      setSessions(sessionsData)
      setSummary(summaryData)
    } catch {
      setError('لم نتمكن من تحميل ملخص التحفيظ. تحقق من الاتصال ثم حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!canManage) return
    request<{ pending_count: number }>('/student-registration/notifications')
      .then(result => setPendingRegistrations(result.pending_count))
      .catch(() => {})
  }, [canManage])

  const handleCreated = (sessionId: number) => {
    setShowModal(false)
    router.push(`/sessions/${sessionId}`)
  }

  if (loading) return <div className="page-loading" role="status"><span className="sr-only">جاري التحميل</span></div>
  if (error || !summary) return <AsyncState message={error || 'تعذر تحميل البيانات'} onRetry={load} />

  const todaySessions = sessions.filter(session => daysFromToday(session.date) === 0)
  const overdueSessions = sessions.filter(session => daysFromToday(session.date) < 0)
  const upcomingSessions = sessions.filter(session => daysFromToday(session.date) > 0).slice(0, 4)
  const todayLabel = formatDateWithWeekday(toLocalDateString(new Date()))

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{todayLabel}</p>
          <h1 className="mt-1 text-2xl font-bold text-deep-900 md:text-3xl">{tahfizName}</h1>
        </div>
        {canManage && (
          <button type="button" onClick={() => setShowModal(true)} className="water-btn flex items-center justify-center gap-1.5 self-start rounded-xl px-5 py-2.5 text-sm font-semibold text-white md:self-auto">
            <Icon name="plus" className="h-4 w-4" /> إضافة حلقة
          </button>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section className="glass-card rounded-2xl p-5" aria-labelledby="today-title">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="today-title" className="text-lg font-bold text-deep-900">حلقات اليوم</h2>
              <Link href="/sessions" className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">كل الحلقات</Link>
            </div>
            {todaySessions.length > 0 ? (
              <div className="space-y-2">
                {todaySessions.map(session => <SessionLine key={session.id} session={session} tone="today" action="تسجيل الحضور" />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-water-300/80 p-5 text-center text-sm text-deep-500">
                <p>لا توجد حلقات مجدولة اليوم.</p>
                {upcomingSessions[0] && <p className="mt-1">أقرب حلقة: <Link href={`/sessions/${upcomingSessions[0].id}`} className="font-bold text-blue-700 hover:underline dark:text-blue-300">{formatDateWithWeekday(upcomingSessions[0].date)}</Link></p>}
                {canManage && <button type="button" onClick={() => setShowModal(true)} className="water-btn-outline mt-3 rounded-xl px-4 py-2 text-sm font-semibold">إضافة حلقة لليوم</button>}
              </div>
            )}
          </section>

          {overdueSessions.length > 0 && (
            <section className="glass-card rounded-2xl border-amber-300/80 p-5 dark:border-amber-800/80" aria-labelledby="overdue-title">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"><Icon name="alert" className="h-4 w-4" /></span>
                <h2 id="overdue-title" className="text-lg font-bold text-deep-900">حلقات سابقة لم تُؤكد</h2>
                <Badge tone="warning">{overdueSessions.length}</Badge>
              </div>
              <div className="space-y-2">
                {overdueSessions.slice(0, 5).map(session => <SessionLine key={session.id} session={session} tone="overdue" action={canManage ? 'مراجعة وتأكيد' : 'فتح'} />)}
              </div>
              {overdueSessions.length > 5 && <Link href="/sessions" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">عرض الباقي ({overdueSessions.length - 5})</Link>}
            </section>
          )}

          {upcomingSessions.length > 0 && (
            <section className="glass-card rounded-2xl p-5" aria-labelledby="upcoming-title">
              <h2 id="upcoming-title" className="mb-4 text-lg font-bold text-deep-900">الحلقات القادمة</h2>
              <div className="space-y-2">
                {upcomingSessions.map(session => <SessionLine key={session.id} session={session} tone="upcoming" action="فتح" />)}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          {canManage && pendingRegistrations > 0 && (
            <Link href="/manage?section=registration" className="glass-card flex items-center gap-3 rounded-2xl border-amber-300/80 p-4 dark:border-amber-800/80">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200"><Icon name="inbox" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-deep-900">طلبات تسجيل جديدة</span>
                <span className="block text-xs text-deep-500">{pendingRegistrations} طلب بانتظار المراجعة</span>
              </span>
              <Icon name="chevron-next" className="h-4 w-4 text-deep-400" />
            </Link>
          )}

          <section className="grid grid-cols-2 gap-3" aria-label="ملخص التحفيظ">
            <StatTile label="طالب نشط" value={summary.students} icon="users" href={canManage ? '/manage' : undefined} />
            <StatTile label="شيخ" value={summary.sheikhs} icon="manage" href={canManage ? '/manage' : undefined} />
            <StatTile label="بانتظار التأكيد" value={summary.pending_sessions} icon="sessions" href="/sessions" />
            <StatTile label="حلقة مؤكدة" value={summary.confirmed_sessions} icon="attendance" href="/attendance" />
          </section>

          <section className="glass-card rounded-2xl p-5" aria-labelledby="shortcuts-title">
            <h2 id="shortcuts-title" className="mb-3 text-lg font-bold text-deep-900">اختصارات</h2>
            <div className="grid gap-2">
              {([
                { href: '/attendance', label: 'سجل الحضور', icon: 'attendance' },
                { href: '/reports', label: 'التقارير', icon: 'reports' },
                { href: '/plan', label: 'إنشاء خطة حفظ', icon: 'list' },
              ] as const).map(item => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl border border-water-200/70 px-3 py-2.5 text-sm font-semibold text-deep-800 transition hover:border-water-400 hover:bg-water-50/60">
                  <Icon name={item.icon} className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {showModal && (
        <CreateSessionModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          onScheduled={() => void load()}
        />
      )}
    </div>
  )
}

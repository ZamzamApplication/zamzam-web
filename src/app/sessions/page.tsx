'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatDateWithWeekday } from '@/lib/format'
import type { Session } from '@/lib/types'
import CreateSessionModal from '@/components/CreateSessionModal'
import AsyncState from '@/components/AsyncState'
import ConfirmDialog from '@/components/ConfirmDialog'
import { canPermanentlyDeleteSession, sessionDeletionConfirmation } from '@/lib/session-lifecycle'
import { sessionDateLabelFromCollection } from '@/lib/session-label'
import { currentMonthValue, financialMonthValue, formatMonth, formatMonthPeriod, monthRange } from '@/lib/month'

export default function SessionsPage() {
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [monthStartDay, setMonthStartDay] = useState(1)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [sessions, user] = await Promise.all([api.getAllSessions(), api.getMe()])
      setAllSessions(sessions)
      setMonthStartDay(user.tahfiz?.month_start_day ?? 1)
      setCanManage(user.role === 'admin' || user.role === 'super_admin')
    } catch {
      setError('لم نتمكن من تحميل الحلقات. تحقق من الاتصال ثم حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const availableMonths = useMemo(() => {
    const months = new Set([currentMonthValue(monthStartDay)])
    for (const session of allSessions) {
      months.add(currentMonthValue(monthStartDay, new Date(`${session.date}T12:00:00`)))
    }
    if (selectedMonth) months.add(selectedMonth)
    return Array.from(months).sort((a, b) => b.localeCompare(a))
  }, [allSessions, monthStartDay, selectedMonth])

  const monthlySessions = useMemo(() => {
    if (!selectedMonth) return allSessions
    const { start, end } = monthRange(selectedMonth, monthStartDay)
    return allSessions.filter((session) => session.date >= start && session.date <= end)
  }, [allSessions, selectedMonth, monthStartDay])

  const sessions = useMemo(() => {
    if (filter === 'upcoming') {
      return monthlySessions
        .filter((session) => !session.is_confirmed)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.daily_sequence || 1) - (b.daily_sequence || 1) || a.id - b.id)
    }
    if (filter === 'past') return monthlySessions.filter((session) => session.is_confirmed)
    return monthlySessions
  }, [monthlySessions, filter])

  const counts = useMemo(() => ({
    upcoming: monthlySessions.filter((session) => !session.is_confirmed).length,
    past: monthlySessions.filter((session) => session.is_confirmed).length,
    all: monthlySessions.length,
  }), [monthlySessions])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteSession(deleteTarget.id)
      setAllSessions((current) => current.filter((session) => session.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError('تعذر حذف الحلقة. لم يتم إجراء أي تغيير، ويمكنك المحاولة مرة أخرى.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleCreated = (sessionId: number) => {
    setShowModal(false)
    router.push(`/sessions/${sessionId}`)
  }

  if (loading) return <div className="page-loading" role="status"><span className="sr-only">جاري التحميل</span></div>

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-deep-800">الحلقات</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/attendance" className="water-btn-outline rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap">سجل الحضور</Link>
          <Link href="/reports" className="water-btn-outline rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap">التقارير</Link>
          {canManage && <button
            onClick={() => setShowModal(true)}
            className="water-btn text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
          >
            + إضافة حلقة
          </button>}
        </div>
      </div>

      <div className="mb-5">
        <label className="block max-w-xl text-sm font-semibold text-deep-700">
          تصفية حسب الشهر
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-3 py-2.5 text-sm">
            <option value="">كل الأشهر</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonth(financialMonthValue(month, monthStartDay))}{monthStartDay !== 1 ? ` (${formatMonthPeriod(month, monthStartDay)})` : ''}
              </option>
            ))}
          </select>
        </label>
        {selectedMonth && <p className="mt-2 text-xs text-deep-500" aria-live="polite">الفترة المعروضة: {formatMonthPeriod(selectedMonth, monthStartDay)}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5 p-1 rounded-xl bg-water-100/35" role="tablist" aria-label="تصفية الحلقات">
        {[
          { key: 'upcoming', label: 'غير مؤكدة', count: counts.upcoming },
          { key: 'past', label: 'مؤكدة', count: counts.past },
          { key: 'all', label: 'الكل', count: counts.all },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => {
              if (filter !== f.key) setFilter(f.key as typeof filter)
            }}
            role="tab"
            aria-selected={filter === f.key}
            className={`px-2 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.key ? 'water-btn text-white' : 'water-btn-outline'
            }`}
          >
            {f.label} <span className="tab-count" aria-label={`${f.count} حلقة`}>{f.count}</span>
          </button>
        ))}
      </div>

      {error ? (
        <AsyncState message={error} onRetry={load} />
      ) : sessions.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
          <div className="text-4xl mb-3">💧</div>
          لا توجد حلقات
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
                  <h3 className="font-semibold text-base sm:text-lg text-deep-800 leading-7">{sessionDateLabelFromCollection(s, allSessions, formatDateWithWeekday)}</h3>
                  {s.circle_name && <p className="text-xs text-deep-500 mt-0.5">{s.circle_name}</p>}
                  {s.student_count != null && <p className="text-xs text-deep-500 mt-0.5">{s.student_count} طالب</p>}
                </div>
                <div className="flex flex-col-reverse sm:flex-row items-end sm:items-center gap-2 shrink-0">
                  {canManage && (canPermanentlyDeleteSession(s) ? <button
                      onClick={(event) => {
                        event.preventDefault()
                        setDeleteTarget(s)
                      }}
                      className="min-h-[2rem] px-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition"
                    >
                      حذف نهائي
                    </button> : <span className="max-w-32 text-left text-[11px] leading-4 text-deep-500">
                      افتح الحلقة وأعد فتحها قبل الحذف
                    </span>)}
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
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف الحلقة"
        message={deleteTarget ? sessionDeletionConfirmation(deleteTarget) : ''}
        confirmLabel="حذف نهائي"
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

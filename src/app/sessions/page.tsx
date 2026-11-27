'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatDateWithWeekday } from '@/lib/format'
import type { Session } from '@/lib/types'
import CreateSessionModal from '@/components/CreateSessionModal'
import SessionSchedules from '@/components/SessionSchedules'
import AsyncState from '@/components/AsyncState'
import ConfirmDialog from '@/components/ConfirmDialog'
import { canPermanentlyDeleteSession, sessionDeletionConfirmation } from '@/lib/session-lifecycle'
import { sessionDateLabelFromCollection } from '@/lib/session-label'
import { currentMonthValue, formatMonthPeriod, monthRange } from '@/lib/month'
import { canManageTahfiz, useCurrentUser } from '@/lib/current-user'
import { toast } from '@/lib/ui-feedback'
import Badge from '@/components/Badge'
import Icon from '@/components/Icon'

type SessionFilter = 'all' | 'upcoming' | 'past'

function SessionRowMenu({ session, onDelete }: { session: Session; onDelete: (session: Session) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="خيارات الحلقة"
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(value => !value) }}
        className="grid h-9 w-9 place-items-center rounded-xl text-deep-500 hover:bg-water-100/60 hover:text-deep-800"
      >
        <Icon name="dots" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-30 mt-1 w-44 rounded-xl border border-water-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            role="menuitem"
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(false); onDelete(session) }}
            className="w-full rounded-xl px-3 py-2 text-right text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            حذف نهائي
          </button>
        </div>
      )}
    </div>
  )
}

export default function SessionsPage() {
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const user = useCurrentUser()
  const canManage = canManageTahfiz(user)
  const monthStartDay = user?.tahfiz?.month_start_day ?? 1
  const [filter, setFilterState] = useState<SessionFilter>('upcoming')
  const [selectedMonth, setSelectedMonthState] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setAllSessions(await api.getAllSessions())
    } catch {
      setError('لم نتمكن من تحميل الحلقات. تحقق من الاتصال ثم حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Filters live in the URL so returning from a session restores the same view.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    if (view === 'all' || view === 'past' || view === 'upcoming') setFilterState(view)
    setSelectedMonthState(params.get('month') || '')
  }, [])

  const syncUrl = (nextFilter: SessionFilter, nextMonth: string) => {
    const params = new URLSearchParams()
    if (nextFilter !== 'upcoming') params.set('view', nextFilter)
    if (nextMonth) params.set('month', nextMonth)
    const query = params.toString()
    router.replace(query ? `/sessions?${query}` : '/sessions', { scroll: false })
  }
  const setFilter = (next: SessionFilter) => { setFilterState(next); syncUrl(next, selectedMonth) }
  const setSelectedMonth = (next: string) => { setSelectedMonthState(next); syncUrl(filter, next) }

  const requestDelete = (session: Session) => {
    if (canPermanentlyDeleteSession(session)) {
      setDeleteTarget(session)
      return
    }
    toast('الحلقات المؤكدة لا تُحذف مباشرة. افتح الحلقة وأعد فتحها أولاً، ثم احذفها.', { tone: 'info', duration: 7000 })
  }

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
    if (filter === 'past') {
      return monthlySessions
        .filter((session) => session.is_confirmed)
        .sort((a, b) => b.date.localeCompare(a.date) || (b.daily_sequence || 1) - (a.daily_sequence || 1) || b.id - a.id)
    }
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
        {canManage && <button
          type="button"
          onClick={() => setShowModal(true)}
          className="water-btn flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
        >
          <Icon name="plus" className="h-4 w-4" /> إضافة حلقة
        </button>}
      </div>

      {canManage && <SessionSchedules onChanged={() => void load()} />}

      <div className="mb-5">
        <label className="block max-w-xl text-sm font-semibold text-deep-700">
          تصفية حسب الشهر
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-3 py-2.5 text-sm">
            <option value="">كل الأشهر</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthPeriod(month, monthStartDay)}
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
            type="button"
            onClick={() => {
              if (filter !== f.key) setFilter(f.key as SessionFilter)
            }}
            role="tab"
            aria-selected={filter === f.key}
            className={`px-2 py-2 rounded-xl text-sm font-medium transition ${
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
        <div className="glass-card rounded-2xl p-8 text-center text-deep-500">
          <Icon name="sessions" className="mx-auto mb-3 h-10 w-10 text-water-500" />
          <p className="font-semibold text-deep-700">{filter === 'upcoming' ? 'لا توجد حلقات بانتظار التأكيد' : 'لا توجد حلقات'}</p>
          {canManage && filter !== 'past' && <button type="button" onClick={() => setShowModal(true)} className="water-btn mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white">إضافة حلقة</button>}
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
                <div className="flex items-center gap-1 shrink-0">
                  <Badge tone={s.is_confirmed ? 'success' : 'warning'}>{s.is_confirmed ? 'مؤكدة' : 'قيد الانتظار'}</Badge>
                  {canManage && <SessionRowMenu session={s} onDelete={requestDelete} />}
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
          onScheduled={() => void load()}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف الحلقة"
        message={deleteTarget ? sessionDeletionConfirmation(deleteTarget) : ''}
        confirmLabel="حذف نهائي"
        busyLabel="جارٍ الحذف..."
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

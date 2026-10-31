'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatDateWithWeekday } from '@/lib/format'
import { matchesTripSearch, tripHeadcount, tripMoney, tripPaymentStatus, tripTime, type CheckStatus, type TripDetail, type TripParticipant } from '@/lib/trips'
import { AddTripPeopleDialog, NewTripRoundDialog, ParticipantTripDialog, AddTripGroupDialog } from './TripForms'
import AsyncState from '@/components/AsyncState'
import ConfirmDialog from '@/components/ConfirmDialog'

const paymentLabels = { paid: 'تم السداد', unpaid: 'لم يسدد', partial: 'سداد جزئي', exempt: 'إعفاء' }
const paymentColors = { paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', unpaid: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300', partial: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300', exempt: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' }
type Tab = 'checkin' | 'roster' | 'payments'

export default function TripWorkspace({ tripId }: { tripId: number }) {
  const [data, setData] = useState<TripDetail | null>(null)
  const [roundId, setRoundId] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [lastRefresh, setLastRefresh] = useState('')
  const [tab, setTab] = useState<Tab>('checkin')
  const [query, setQuery] = useState('')
  const [groupScope, setGroupScope] = useState('all')
  const [selectedPeople, setSelectedPeople] = useState<Set<number>>(new Set())
  const [assignGroupId, setAssignGroupId] = useState('')
  const [checkFilter, setCheckFilter] = useState<CheckStatus | 'all' | 'unconfirmed'>('all')
  const [paymentFilter, setPaymentFilter] = useState<keyof typeof paymentLabels | 'all'>('all')
  const [showCancelled, setShowCancelled] = useState(false)
  const [dialog, setDialog] = useState<'people' | 'round' | 'group' | null>(null)
  const [editing, setEditing] = useState<TripParticipant | null>(null)
  const [busy, setBusy] = useState<number | 'trip' | null>(null)
  const [confirmStatus, setConfirmStatus] = useState(false)
  const [copyText, setCopyText] = useState<string | null>(null)
  const requestSequence = useRef(0)
  const inFlight = useRef(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (quiet = false, selected = roundId) => {
    const sequence = ++requestSequence.current
    if (!quiet) setLoading(true)
    try {
      const detail = await api.getTrip(tripId, selected)
      if (sequence !== requestSequence.current) return
      setData(detail); setError(''); setLastRefresh(new Date().toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' }))
    } catch (err: any) {
      if (sequence === requestSequence.current) setError(err.message || 'تعذر تحميل بيانات الرحلة')
    } finally { if (sequence === requestSequence.current) setLoading(false) }
  }, [tripId, roundId])

  useEffect(() => { void load(); return () => { requestSequence.current++ } }, [load])
  useEffect(() => {
    const refresh = () => { if (!document.hidden && !inFlight.current && !dialog && !editing && !confirmStatus && copyText === null) void load(true) }
    const timer = window.setInterval(refresh, 15000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [load, dialog, editing, confirmStatus, copyText])
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !dialog && !editing) { event.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [dialog, editing])

  const mutate = async (id: number | 'trip', action: () => Promise<unknown>) => {
    if (inFlight.current) return
    inFlight.current = true; requestSequence.current++; setBusy(id); setError(''); setNotice('')
    try { await action(); await load(true); setNotice('تم الحفظ ✓') }
    catch (err: any) { await load(true); setError(err.message || 'تعذر الحفظ. حاول مرة أخرى.'); }
    finally { setBusy(null); inFlight.current = false }
  }

  const checks = useMemo(() => new Map(data?.checks.map(check => [check.participant_id, check]) || []), [data?.checks])
  if (loading) return <div className="page-loading" aria-label="جاري تحميل الرحلة" />
  if (!data) return <AsyncState message={error || 'الرحلة غير موجودة'} onRetry={() => load()} />

  const { trip, participants, rounds, groups } = data
  const selectedRound = rounds.find(round => round.id === data.selected_round_id)
  const closed = trip.status === 'completed'
  const readOnlyRound = closed || !selectedRound || Boolean(selectedRound.closed_at)
  const inGroup = (groupId: number | null) => groupScope === 'all' || (groupScope === 'none' ? groupId === null : groupId === Number(groupScope))
  const groupLabel = groupScope === 'all' ? 'جميع المشاركين' : groupScope === 'none' ? 'بدون مجموعة' : groups.find(group => group.id === Number(groupScope))?.name || 'المجموعة'
  const active = participants.filter(person => person.active && inGroup(person.group_id))
  const allActive = participants.filter(person => person.active)
  const adults = allActive.filter(person => person.is_adult && !person.guardian_id)
  const { expected, present, pending, absent, allPresent } = tripHeadcount(data.checks, groupScope)
  const collected = participants.filter(person => inGroup(person.group_id)).reduce((sum, person) => sum + person.paid_minor, 0)
  const remaining = active.reduce((sum, person) => sum + (person.payment_exempt ? 0 : Math.max(0, person.fee_minor - person.paid_minor)), 0)
  const paidCount = active.filter(person => tripPaymentStatus(person) === 'paid').length
  const exemptCount = active.filter(person => person.payment_exempt).length
  const unsettled = active.filter(person => ['partial', 'unpaid'].includes(tripPaymentStatus(person))).length
  const basePeople = tab === 'checkin' ? participants.filter(person => checks.has(person.id) && inGroup(checks.get(person.id)!.group_id)) : participants.filter(person => inGroup(person.group_id) && (showCancelled ? !person.active : person.active))
  const visible = basePeople.filter(person => matchesTripSearch({ ...person, sheikh_name: [person.sheikh_name, participants.find(adult => adult.id === person.guardian_id)?.name, groups.find(group => group.id === person.group_id)?.name].filter(Boolean).join(' ') }, query)).filter(person => tab === 'checkin' ? checkFilter === 'all' || (checkFilter === 'unconfirmed' ? checks.get(person.id)?.status !== 'present' : checks.get(person.id)?.status === checkFilter) : tab !== 'payments' || paymentFilter === 'all' || tripPaymentStatus(person) === paymentFilter)
  const checkCounts = { all: expected, pending, present, absent, unconfirmed: pending + absent }
  const paymentCounts = { all: basePeople.length, paid: basePeople.filter(person => tripPaymentStatus(person) === 'paid').length, unpaid: basePeople.filter(person => tripPaymentStatus(person) === 'unpaid').length, partial: basePeople.filter(person => tripPaymentStatus(person) === 'partial').length, exempt: basePeople.filter(person => person.payment_exempt).length }
  const registeredStudentIds = new Set(participants.flatMap(person => person.student_id ? [person.student_id] : []))

  return <div className="mx-auto max-w-6xl space-y-5 pb-6">
    <Link href="/trips" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-deep-500 hover:text-blue-700">→ جميع الرحلات</Link>
    <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white sm:p-8">
      <div className="pointer-events-none absolute -left-14 top-0 h-72 w-72 rounded-full border-[32px] border-cyan-300/10" aria-hidden="true" />
      <div className="relative flex flex-wrap items-start justify-between gap-5"><div><span className={`inline-block rounded-full border px-3 py-1 text-[11px] font-bold ${closed ? 'border-slate-600 text-slate-300' : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'}`}>{closed ? 'رحلة منتهية · السجلات محفوظة' : 'تجهيز الرحلة ومتابعة المشاركين'}</span><h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{trip.name}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-6 text-slate-300"><span>◷ {formatDateWithWeekday(trip.date)}{trip.departure_time && ` · ${trip.departure_time}`}</span>{trip.destination && <span>⌖ {trip.destination}</span>}{trip.meeting_point && <span>التجمع: {trip.meeting_point}</span>}</div></div><div className="flex flex-wrap gap-2">{!closed && <><button type="button" onClick={() => setDialog('people')} disabled={busy !== null} className="min-h-11 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold transition hover:bg-white/10 disabled:opacity-50">＋ إضافة مشاركين</button><button type="button" disabled={busy !== null || allActive.length === 0} onClick={() => setDialog('round')} className="min-h-11 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40">{rounds.length ? '✓ تحقق جديد' : '✓ بدء تحقق الصباح'}</button></>}</div></div>
      {trip.notes && <p className="relative mt-5 whitespace-pre-wrap rounded-xl bg-white/5 px-4 py-3 text-xs leading-7 text-slate-300">{trip.notes}</p>}
    </section>

    <div className="glass-card rounded-2xl p-3 sm:p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-deep-800">المجموعات ووسائل الانتقال</h2><p className="mt-1 text-[11px] leading-5 text-deep-500">تحقق من مجموعة واحدة أو اعرض الجميع. كل شخص له تسجيل حضور مستقل.</p></div>{!closed && <button type="button" disabled={busy !== null} onClick={() => setDialog('group')} className="water-btn-outline min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold">＋ مجموعة</button>}</div><div className="flex gap-2 overflow-x-auto pb-1" aria-label="تصفية حسب المجموعة">{[{ id: 'all', name: 'جميع المشاركين' }, ...groups.map(group => ({ id: String(group.id), name: group.name })), { id: 'none', name: 'بدون مجموعة' }].map(group => { const matches = (id: number | null) => group.id === 'all' || (group.id === 'none' ? id === null : id === Number(group.id)); const count = tab === 'checkin' && selectedRound ? data.checks.filter(check => matches(check.group_id)).length : allActive.filter(person => matches(person.group_id)).length; return <button key={group.id} type="button" aria-pressed={groupScope === group.id} onClick={() => { setGroupScope(group.id); setSelectedPeople(new Set()); setQuery('') }} className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl border px-4 py-2 text-xs font-bold transition ${groupScope === group.id ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-water-200 text-deep-500 hover:border-cyan-300'}`}><span>{group.name}</span><span className="opacity-70">{count}</span></button> })}</div></div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="المشاركون" value={String(active.length)} detail={`${active.filter(person => person.kind === 'student').length} طالب · ${active.filter(person => person.kind === 'guest').length} ضيف`} onClick={() => setTab('roster')} />
      <Stat label="معنا في هذا التحقق" value={selectedRound ? `${present} / ${expected}` : '—'} detail={selectedRound ? selectedRound.title : 'ابدأ أول جولة تحقق'} accent onClick={() => { setTab('checkin'); setCheckFilter('all') }} />
      <Stat label="بانتظار الاطمئنان عليهم" value={selectedRound ? String(pending + absent) : '—'} detail={selectedRound ? `${pending} لم يُتحقق · ${absent} غير موجود` : 'كل جولة تبدأ من جديد'} warning={pending + absent > 0} onClick={() => { setTab('checkin'); setCheckFilter('unconfirmed') }} />
      <Stat label="المتبقي للتحصيل" value={tripMoney(remaining, trip.currency)} detail={`${unsettled} لم يكمل السداد · ${exemptCount} إعفاء`} onClick={() => setTab('payments')} />
    </div>

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"><span>{error} لم تُسجل أي تغييرات غير مؤكدة.</span><button type="button" onClick={() => load(true)} className="min-h-9 font-bold underline">تحديث البيانات</button></div>}
    <div role="status" aria-live="polite" className="sr-only">{notice}</div>

    <section className="glass-card overflow-hidden rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-water-200/60 px-4 pt-4 sm:px-6"><div className="flex gap-1" role="tablist" aria-label="أقسام الرحلة">{([{ id: 'checkin', label: 'التحقق والحضور' }, { id: 'roster', label: 'المشاركون' }, { id: 'payments', label: 'المدفوعات' }] as const).map(item => <button role="tab" id={`trip-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="trip-panel" type="button" key={item.id} onClick={() => { setTab(item.id); setQuery(''); setSelectedPeople(new Set()) }} className={`min-h-12 border-b-2 px-3 pb-3 pt-2 text-xs font-bold transition sm:px-4 sm:text-sm ${tab === item.id ? 'border-cyan-500 text-blue-700 dark:text-cyan-300' : 'border-transparent text-deep-500 hover:text-deep-800'}`}>{item.label}</button>)}</div><span className="mb-3 flex items-center gap-1.5 text-[10px] text-deep-500"><span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-amber-500' : 'bg-emerald-500'}`} />{busy !== null ? 'جاري الحفظ…' : `آخر تحديث ${lastRefresh}`}</span></div>
      <div id="trip-panel" role="tabpanel" aria-labelledby={`trip-tab-${tab}`} className="p-4 sm:p-6">
        {tab === 'checkin' && !selectedRound ? <Empty title="نبدأ بالتجهيز، ثم نطمئن على الجميع" message="أضف المشاركين أولاً، ثم ابدأ تحقق الصباح. يمكنك إنشاء جولة جديدة في أي وقت أثناء الرحلة." action={!closed && <button type="button" onClick={() => setDialog(active.length ? 'round' : 'people')} className="water-btn mt-5 min-h-11 rounded-xl px-5 py-2 text-sm font-bold text-white">{active.length ? 'بدء تحقق الصباح' : 'إضافة المشاركين'}</button>} /> : <>
          {tab === 'checkin' && selectedRound && <div className="mb-5 rounded-2xl border border-water-200 bg-water-50/50 p-4 dark:bg-slate-900/30"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold text-deep-500">{readOnlyRound ? 'سجل تحقق سابق' : 'جولة التحقق الحالية'}</p><h2 className="mt-1 text-base font-bold text-deep-900">{selectedRound.title}</h2><p className="mt-1 text-xs text-deep-500">بدأت {tripTime(selectedRound.created_at)} · {formatDateWithWeekday(selectedRound.created_at.slice(0, 10))}</p></div><label className="text-xs text-deep-500">الجولات المحفوظة<select aria-label="اختر جولة التحقق" disabled={busy !== null} value={roundId || ''} onChange={event => { setRoundId(event.target.value ? Number(event.target.value) : undefined); setQuery(''); setCheckFilter('all') }} className="surface-field mt-1.5 block min-h-11 max-w-56 rounded-xl px-3 py-2 text-sm"><option value="">الجولة الأحدث</option>{rounds.slice(1).map(round => <option key={round.id} value={round.id}>{round.title} · {tripTime(round.created_at)}</option>)}</select></label></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-water-200/70 dark:bg-slate-700" role="progressbar" aria-label="نسبة الموجودين" aria-valuemin={0} aria-valuemax={expected || 1} aria-valuenow={present}><div className="h-full rounded-full bg-cyan-500 transition-[width] duration-300" style={{ width: `${expected ? present / expected * 100 : 0}%` }} /></div>
            {readOnlyRound ? <p className="mt-3 text-xs leading-6 text-deep-500">هذه الجولة للعرض فقط؛ يحتفظ كل تحقق بسجله الخاص.{roundId && !closed && <button onClick={() => setRoundId(undefined)} className="mr-2 font-bold text-blue-700 dark:text-cyan-300">العودة للتحقق الحالي ←</button>}</p> : allPresent ? <p role="status" className="mt-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">✓ {groupScope === 'all' ? 'الجميع موجود في هذه الجولة' : `جميع أفراد ${groupLabel} موجودون`} ({present} مشارك)</p> : <p className="mt-3 text-xs leading-6 text-deep-500">تحقق من وجود كل مشارك الآن، ثم اضغط «موجود». التسجيل محفوظ لكل شخص بشكل منفصل.</p>}
          </div>}

          {tab === 'payments' && <div className="mb-5 grid gap-3 rounded-2xl border border-water-200 bg-water-50/40 p-4 dark:bg-slate-900/30 sm:grid-cols-3"><div><p className="text-xs text-deep-500">إجمالي ما تم تحصيله</p><p className="mt-1 text-lg font-extrabold text-deep-900">{tripMoney(collected, trip.currency)}</p><p className="mt-1 text-[10px] text-deep-500">يشمل المبالغ المحتفظ بها للمشاركات الملغاة</p></div><div><p className="text-xs text-deep-500">أكملوا السداد</p><p className="mt-1 text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{paidCount} مشارك</p></div><div><p className="text-xs text-deep-500">إعفاء من الرسوم</p><p className="mt-1 text-lg font-extrabold text-violet-700 dark:text-violet-300">{exemptCount} مشارك</p><p className="mt-1 text-[10px] text-deep-500">لا يُحسبون ضمن المبالغ المتبقية</p></div></div>}

          <div className="relative"><svg className="pointer-events-none absolute right-3.5 top-3.5 h-5 w-5 text-deep-400" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input ref={searchRef} aria-label="البحث عن مشارك" placeholder="ابحث بالاسم، الهاتف، الشيخ أو اسم المرافق…" value={query} onChange={event => setQuery(event.target.value)} className="surface-field min-h-12 w-full rounded-2xl py-3 pl-12 pr-11 text-sm focus:ring-2 focus:ring-cyan-400" />{query ? <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label="مسح البحث" className="absolute left-2 top-1.5 h-9 w-9 rounded-lg text-lg text-deep-500">×</button> : <kbd className="absolute left-4 top-3.5 hidden rounded border border-water-200 px-1.5 text-xs text-deep-400 sm:block">/</kbd>}</div>
          <div className="mb-4 mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {tab === 'checkin' && (['all', 'unconfirmed', 'pending', 'absent', 'present'] as const).map(filter => <FilterPill key={filter} selected={checkFilter === filter} onClick={() => setCheckFilter(filter)} label={{ all: 'الجميع', unconfirmed: 'لم يتأكد حضورهم', pending: 'لم يُتحقق', absent: 'غير موجود', present: 'موجود' }[filter]} count={checkCounts[filter]} />)}
              {tab === 'payments' && (['all', 'unpaid', 'partial', 'exempt', 'paid'] as const).map(filter => <FilterPill key={filter} selected={paymentFilter === filter} onClick={() => setPaymentFilter(filter)} label={filter === 'all' ? 'الجميع' : paymentLabels[filter]} count={paymentCounts[filter]} />)}
              {tab !== 'checkin' && <button type="button" aria-pressed={showCancelled} onClick={() => setShowCancelled(value => !value)} className={`min-h-10 rounded-xl border px-3 py-2 text-xs ${showCancelled ? 'border-amber-400 text-amber-700 dark:text-amber-300' : 'border-water-200 text-deep-500'}`}>{showCancelled ? 'المشاركات الملغاة' : 'عرض الملغين'}</button>}
            </div><span aria-live="polite" className="text-xs text-deep-500">{visible.length} من {basePeople.length}</span>
          </div>
          {tab === 'roster' && !closed && visible.some(person => person.active) && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-water-200 bg-water-50/50 p-3 dark:bg-slate-900/40"><label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs font-bold text-deep-600"><input type="checkbox" className="h-5 w-5 accent-cyan-600" checked={visible.filter(person => person.active).every(person => selectedPeople.has(person.id))} onChange={event => setSelectedPeople(current => { const next = new Set(current); visible.filter(person => person.active).forEach(person => event.target.checked ? next.add(person.id) : next.delete(person.id)); return next })} />تحديد المعروضين</label><span className="text-xs text-deep-500">{selectedPeople.size} محدد</span>{selectedPeople.size > 0 && <><select aria-label="المجموعة التي سينتقل إليها المحددون" value={assignGroupId} onChange={event => setAssignGroupId(event.target.value)} className="surface-field min-h-10 min-w-32 rounded-lg px-3 py-2 text-xs"><option value="" disabled>نقل إلى مجموعة…</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}<option value="none">بدون مجموعة</option></select><button type="button" disabled={busy !== null || !assignGroupId} onClick={() => mutate('trip', async () => { await api.assignTripGroup(tripId, assignGroupId === 'none' ? null : Number(assignGroupId), participants.filter(person => person.active && selectedPeople.has(person.id)).map(person => ({ id: person.id, expected_version: person.version }))); setSelectedPeople(new Set()); setAssignGroupId('') })} className="water-btn min-h-10 rounded-lg px-4 text-xs font-bold text-white disabled:opacity-50">توزيع المحددين</button><button type="button" onClick={() => setSelectedPeople(new Set())} className="min-h-10 text-xs text-deep-500">إلغاء التحديد</button></>}</div>}
          {visible.length === 0 ? <Empty title={query ? 'لا توجد نتائج لهذا البحث' : tab === 'checkin' && checkFilter === 'pending' ? 'لا يوجد مشاركون بانتظار التحقق' : 'لا يوجد مشاركون في هذه القائمة'} message={query ? 'جرّب جزءاً من الاسم أو رقم الهاتف، أو امسح البحث.' : 'يمكنك تغيير التصفية أو إضافة مشاركين للرحلة.'} /> : <div className="space-y-2.5">{visible.map(person => {
            const check = checks.get(person.id)
            const payment = tripPaymentStatus(person)
            return <article key={person.id} className={`rounded-2xl border p-3.5 transition sm:p-4 ${tab === 'checkin' && check?.status === 'present' ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/15' : tab === 'checkin' && check?.status === 'absent' ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900 dark:bg-rose-950/15' : 'border-water-200/80 bg-white/50 dark:bg-slate-800/30'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 flex-1 items-center gap-3">{tab === 'roster' && !closed && person.active && <input type="checkbox" aria-label={`تحديد ${person.name} لتوزيع المجموعة`} checked={selectedPeople.has(person.id)} onChange={() => setSelectedPeople(current => { const next = new Set(current); next.has(person.id) ? next.delete(person.id) : next.add(person.id); return next })} className="h-5 w-5 shrink-0 accent-cyan-600" />}<span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-base font-bold ${person.kind === 'guest' ? 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300' : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'}`}>{person.name.charAt(0)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold leading-6 text-deep-900">{person.name}</h3>{person.kind === 'guest' && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">ضيف</span>}{!person.active && <span className="text-[10px] text-amber-700 dark:text-amber-300">مشاركة ملغاة</span>}</div><p className="mt-1 text-[11px] leading-5 text-deep-500">{[person.student_code && `#${person.student_code}`, person.sheikh_name].filter(Boolean).join(' · ') || (person.kind === 'guest' ? 'ضيف الرحلة' : 'طالب')}{person.phone && <> · <a href={`tel:${person.phone}`} dir="ltr" className="inline-block underline-offset-2 hover:underline">{person.phone}</a></>}</p><p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-deep-500"><span className="font-bold text-blue-700 dark:text-cyan-300">{groups.find(group => group.id === (tab === 'checkin' ? check?.group_id : person.group_id))?.name || 'بدون مجموعة'}</span><span>·</span><span>{person.is_adult ? `مرافق بالغ${participants.filter(child => child.active && child.guardian_id === person.id).length ? ` · مسؤول عن ${participants.filter(child => child.active && child.guardian_id === person.id).length}` : ''}` : person.guardian_id ? `مع ${participants.find(adult => adult.id === person.guardian_id)?.name || 'مرافق'}` : 'مستقل / بدون مرافق'}</span></p></div></div>
              {tab === 'checkin' && check ? <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                {readOnlyRound ? <span className={`rounded-xl px-4 py-2 text-xs font-bold ${check.status === 'present' ? paymentColors.paid : check.status === 'absent' ? paymentColors.unpaid : 'bg-water-100 text-deep-500 dark:bg-slate-700'}`}>{{ present: '✓ موجود', absent: 'غير موجود', pending: 'لم يُتحقق' }[check.status]}</span> : <><button type="button" aria-label={`تسجيل ${person.name} موجود`} aria-pressed={check.status === 'present'} disabled={busy !== null} onClick={() => mutate(person.id, () => api.markTripCheck(tripId, selectedRound!.id, person.id, 'present', check.version))} className={`min-h-12 flex-1 rounded-xl border px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 sm:flex-none ${check.status === 'present' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-950 dark:text-cyan-200'}`}>{busy === person.id ? 'جاري الحفظ…' : check.status === 'present' ? '✓ موجود' : 'تسجيل موجود'}</button><button type="button" aria-label={`تسجيل ${person.name} غير موجود`} aria-pressed={check.status === 'absent'} disabled={busy !== null} onClick={() => mutate(person.id, () => api.markTripCheck(tripId, selectedRound!.id, person.id, 'absent', check.version))} className={`min-h-12 rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:opacity-50 ${check.status === 'absent' ? 'border-rose-500 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'border-water-200 text-deep-500 hover:border-rose-300'}`}>غير موجود</button></>}
              </div> : <div className="flex flex-wrap items-center gap-2"><span title={person.exemption_reason || undefined} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${paymentColors[payment]}`}>{paymentLabels[payment]}</span>{tab === 'payments' && !closed && person.active && payment !== 'paid' && payment !== 'exempt' && <button type="button" disabled={busy !== null} onClick={() => mutate(person.id, () => api.updateTripParticipant(tripId, person.id, { expected_version: person.version, paid_minor: person.fee_minor }))} className="min-h-11 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-300">{busy === person.id ? 'جاري الحفظ…' : 'تسجيل السداد'}</button>}{!closed && <button type="button" aria-label={`تعديل مشاركة ${person.name}`} disabled={busy !== null} onClick={() => setEditing(person)} className="water-btn-outline min-h-11 rounded-xl px-3 py-2 text-xs font-bold">{tab === 'payments' ? 'تعديل / إعفاء' : 'التفاصيل'}</button>}</div>}
              </div>
              {(person.notes || (tab === 'payments' && person.exemption_reason && person.payment_exempt)) && <p className="mr-14 mt-2 whitespace-pre-wrap text-xs leading-6 text-deep-500">{person.notes}{person.notes && person.exemption_reason && person.payment_exempt && ' · '}{person.payment_exempt && person.exemption_reason && `سبب الإعفاء: ${person.exemption_reason}`}</p>}
              {tab === 'payments' && <div className="mr-14 mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-deep-500"><span>الرسوم: {tripMoney(person.fee_minor, trip.currency)}</span><span>المدفوع: <strong className="font-bold text-deep-800">{tripMoney(person.paid_minor, trip.currency)}</strong></span><span>{person.payment_exempt ? 'معفى من المتبقي' : `المتبقي: ${tripMoney(person.fee_minor - person.paid_minor, trip.currency)}`}</span></div>}
              {tab === 'checkin' && check && <div className="mr-14 mt-2 flex items-center justify-between gap-2 text-[10px] text-deep-500"><span>{check.checked_at ? `تم التسجيل ${tripTime(check.checked_at)}` : 'لم يتم التحقق بعد'}</span>{!readOnlyRound && check.status !== 'pending' && <button type="button" disabled={busy !== null} onClick={() => mutate(person.id, () => api.markTripCheck(tripId, selectedRound!.id, person.id, 'pending', check.version))} className="min-h-8 px-2 underline underline-offset-2">تراجع</button>}</div>}
            </article>
          })}</div>}
          {visible.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-deep-500">{tab === 'checkin' ? 'تحديث تلقائي كل ١٥ ثانية. تأكد من وقت آخر تحديث قبل الانطلاق.' : 'يتم حفظ التغييرات فور تسجيلها.'}</p><button type="button" onClick={() => setCopyText(visible.map(person => person.name).join('\n'))} className="min-h-10 text-xs font-bold text-blue-700 dark:text-cyan-300">نسخ أسماء هذه القائمة</button></div>}
        </>}
      </div>
    </section>
    <div className="flex items-center justify-between gap-3 px-1"><p className="text-[11px] leading-6 text-deep-500">إدارة الرحلات متاحة لمديري التحفيظ.</p><button type="button" disabled={busy !== null} onClick={() => setConfirmStatus(true)} className="min-h-10 text-xs font-semibold text-deep-500 underline underline-offset-4">{closed ? 'إعادة فتح الرحلة' : 'إنهاء الرحلة وأرشفتها'}</button></div>

    {dialog === 'people' && <AddTripPeopleDialog tripId={tripId} registeredStudentIds={registeredStudentIds} groups={groups} adults={adults} defaultGroup={groupScope !== 'all' && groupScope !== 'none' ? Number(groupScope) : null} onClose={() => setDialog(null)} onSaved={() => load(true)} />}
    {dialog === 'group' && <AddTripGroupDialog onClose={() => setDialog(null)} onSave={async name => { await api.addTripGroup(tripId, name); await load(true) }} />}
    {dialog === 'round' && <NewTripRoundDialog first={rounds.length === 0} onClose={() => setDialog(null)} onStart={async title => { await api.startTripRound(tripId, title, trip.version); setRoundId(undefined); setTab('checkin'); setCheckFilter('all'); setQuery(''); await load(true, 0) }} />}
    {editing && <ParticipantTripDialog person={editing} currency={trip.currency} groups={groups} adults={adults} onClose={() => setEditing(null)} onSave={async body => { await api.updateTripParticipant(tripId, editing.id, { ...body, expected_version: editing.version }); await load(true) }} />}
    {copyText !== null && <CopyTripNames text={copyText} onClose={() => setCopyText(null)} />}
    <ConfirmDialog open={confirmStatus} title={closed ? 'إعادة فتح الرحلة' : 'إنهاء الرحلة'} message={closed ? 'ستتمكن من تعديل المشاركين والمدفوعات وبدء جولة تحقق جديدة.' : `سيتم حفظ الجولات وإيقاف تعديلها والمدفوعات. تأكد من مراجعة أحدث جولة لكل المجموعات قبل الإنهاء. يمكن إعادة فتح الرحلة لاحقاً.`} confirmLabel={closed ? 'إعادة الفتح' : 'إنهاء وأرشفة'} busy={busy === 'trip'} onClose={() => setConfirmStatus(false)} onConfirm={() => mutate('trip', async () => { await api.setTripStatus(tripId, closed ? 'planned' : 'completed', trip.version); setConfirmStatus(false) })} />
  </div>
}

function Stat({ label, value, detail, accent, warning, onClick }: { label: string; value: string; detail: string; accent?: boolean; warning?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-right transition hover:shadow-md ${accent ? 'border-cyan-300 bg-cyan-50/70 dark:border-cyan-800 dark:bg-cyan-950/30' : warning ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20' : 'glass-card border-water-200'}`}><p className="text-[11px] font-semibold text-deep-500">{label}</p><p className={`mt-2 break-words text-xl font-extrabold sm:text-2xl ${accent ? 'text-cyan-700 dark:text-cyan-300' : warning ? 'text-amber-700 dark:text-amber-300' : 'text-deep-900'}`}>{value}</p><p className="mt-2 text-[10px] leading-5 text-deep-500">{detail}</p></button>
}

function FilterPill({ selected, onClick, label, count }: { selected: boolean; onClick: () => void; label: string; count: number }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${selected ? 'border-cyan-500 bg-cyan-600 text-white shadow-sm' : 'border-water-200 text-deep-500 hover:border-cyan-300'}`}><span>{label}</span><span className={`rounded-md px-1.5 py-0.5 text-[10px] ${selected ? 'bg-white/15' : 'bg-water-100 dark:bg-slate-700'}`}>{count}</span></button>
}

function Empty({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <div className="px-4 py-12 text-center"><span aria-hidden="true" className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-water-100 text-2xl text-cyan-600 dark:bg-slate-800">⌕</span><h3 className="font-bold text-deep-800">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-7 text-deep-500">{message}</p>{action}</div>
}

function CopyTripNames({ text, onClose }: { text: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { dialogRef.current?.showModal() }, [])
  return <dialog ref={dialogRef} dir="rtl" onClose={onClose} aria-label="أسماء المشاركين كنص" className="glass-card m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl p-6 text-deep-800 backdrop:bg-slate-950/60"><h2 className="text-lg font-bold">أسماء المشاركين</h2><p className="mt-2 text-xs text-deep-500">تشمل القائمة نتائج البحث والتصفية المعروضة.</p><textarea autoFocus ref={textRef} readOnly aria-label="نص أسماء المشاركين" value={text} onFocus={event => event.target.select()} className="surface-field mt-4 h-64 w-full rounded-xl p-3 text-sm leading-7" /><p role="status" className="mt-2 text-xs text-deep-500">{error || (copied ? 'تم النسخ ✓' : '')}</p><div className="mt-4 flex justify-end gap-2"><button onClick={onClose} className="water-btn-outline min-h-11 rounded-xl px-4 text-sm">إغلاق</button><button onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true) } catch { textRef.current?.focus(); textRef.current?.select(); setError('يمكنك نسخ النص المحدد يدوياً.') } }} className="water-btn min-h-11 rounded-xl px-4 text-sm font-bold text-white">{copied ? 'تم النسخ ✓' : 'نسخ الأسماء'}</button></div></dialog>
}

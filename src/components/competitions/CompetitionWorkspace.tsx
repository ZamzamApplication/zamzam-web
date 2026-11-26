'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import AsyncState from '@/components/AsyncState'
import ConfirmDialog from '@/components/ConfirmDialog'
import RegistrationQr from '@/components/RegistrationQr'
import ScrollableTable from '@/components/ScrollableTable'
import TrophyCup from '@/components/competitions/TrophyCup'
import StudentAvatar from '@/components/competitions/StudentAvatar'
import { AddCompetitorsDialog, CompetitionFormDialog } from '@/components/competitions/CompetitionForms'
import { matchesTripSearch } from '@/lib/trips'
import {
  STATUS_LABELS, TROPHY_META, addDays, arabicNumber, clampDay, elapsedDays, entryKey, entrySet, localToday,
  podiumOrder, publicToken, shortDate, type CompetitionDetail, type CompetitionStanding, type CompetitionStatus,
} from '@/lib/competitions'
import { getArabicDay } from '@/lib/format'

type Tab = 'day' | 'grid' | 'standings'

export default function CompetitionWorkspace({ competitionId }: { competitionId: number }) {
  const [detail, setDetail] = useState<CompetitionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState<Tab>('day')
  const [day, setDay] = useState(localToday())
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<'settings' | 'add' | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'end' } | { kind: 'remove'; id: number; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const next = await api.getCompetition(competitionId)
      setDetail(next)
      setDay(current => clampDay(current, next.competition.start_date, next.competition.end_date))
    } catch (err: any) { setError(err.message || 'تعذر تحميل المسابقة') } finally { setLoading(false) }
  }, [competitionId])
  useEffect(() => {
    try { const role = JSON.parse(localStorage.getItem('user') || '{}').role; setIsAdmin(role === 'admin' || role === 'super_admin') } catch { setIsAdmin(false) }
    void load()
  }, [load])

  const done = useMemo(() => entrySet(detail?.entries ?? []), [detail])
  if (loading) return <div className="page-loading" aria-label="جاري تحميل المسابقة" />
  if (!detail) return <AsyncState message={error || 'المسابقة غير موجودة'} onRetry={() => load()} />

  const { competition, participants, standings } = detail
  const today = localToday()
  const canRecord = competition.status === 'active'
  const visible = participants.filter(p => matchesTripSearch({ name: p.name, phone: '', student_code: '', sheikh_name: '' }, query))
  const markable = visible.filter(p => p.can_record)
  const doneCount = participants.filter(p => done.has(entryKey(p.id, day))).length
  const latestAllowed = addDays(today, 1) < competition.end_date ? addDays(today, 1) : competition.end_date
  const token = publicToken(competition.public_url)
  const shareUrl = token && typeof window !== 'undefined' ? `${window.location.origin}/leaderboard/${token}` : ''

  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3500) }

  /** Optimistically toggles entries, then reconciles with the server (rolling back on failure). */
  const record = async (ids: number[], date: string, value: boolean) => {
    if (!ids.length || !canRecord) return
    const keys = ids.map(id => entryKey(id, date))
    setPending(current => new Set([...current, ...keys]))
    setDetail(current => current && {
      ...current,
      entries: value
        ? [...current.entries.filter(e => !keys.includes(entryKey(e.participant_id, e.date))), ...ids.map(id => ({ participant_id: id, date, points: competition.points_per_check }))]
        : current.entries.filter(e => !keys.includes(entryKey(e.participant_id, e.date))),
    })
    try {
      await api.recordCompetitionEntries(competition.id, date, ids, value)
      await load(true)
    } catch (err: any) {
      flash(err.message || 'تعذر الحفظ')
      await load(true)
    } finally {
      setPending(current => { const next = new Set(current); keys.forEach(key => next.delete(key)); return next })
    }
  }

  const changeStatus = async (status: CompetitionStatus) => {
    setBusy(true)
    try { await api.setCompetitionStatus(competition.id, status, competition.version); await load(true); flash(status === 'active' ? 'المسابقة جارية الآن' : status === 'ended' ? 'تم إنهاء المسابقة وتجميد النتائج' : 'أُعيدت إلى المسودة') }
    catch (err: any) { flash(err.message || 'تعذر تغيير الحالة') } finally { setBusy(false); setConfirm(null) }
  }
  const setLink = async (enabled: boolean, regenerate = false) => {
    setBusy(true)
    try { await api.setCompetitionPublicLink(competition.id, enabled, regenerate, competition.version); await load(true); flash(regenerate ? 'تم إنشاء رابط جديد؛ الرابط القديم لم يعد يعمل' : enabled ? 'الرابط العام مفعّل' : 'تم إيقاف الرابط العام') }
    catch (err: any) { flash(err.message || 'تعذر تحديث الرابط') } finally { setBusy(false) }
  }
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); flash('تم نسخ الرابط') } catch { flash('انسخ الرابط يدوياً من الحقل') }
  }
  const removeParticipant = async (id: number) => {
    setBusy(true)
    try { await api.removeCompetitionParticipant(competition.id, id); await load(true); flash('تمت إزالة المتسابق') }
    catch (err: any) { flash(err.message || 'تعذر الإزالة') } finally { setBusy(false); setConfirm(null) }
  }

  const tabs: { key: Tab; label: string }[] = [{ key: 'day', label: 'تسجيل يومي' }, { key: 'grid', label: 'الجدول الكامل' }, { key: 'standings', label: 'الترتيب' }]

  return <div className="mx-auto max-w-6xl space-y-5 pb-24 md:pb-6">
    <div className="flex items-center justify-between gap-3"><Link href="/competitions" className="text-sm font-bold text-blue-700 dark:text-cyan-300">→ كل المسابقات</Link>{notice && <span role="status" className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white dark:bg-white dark:text-slate-900">{notice}</span>}</div>

    <section className="glass-card rounded-3xl p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">{STATUS_LABELS[competition.status]}</span>
          <h1 className="mt-3 text-2xl font-extrabold text-deep-900 sm:text-3xl">{competition.title}</h1>
          <p className="mt-2 text-sm text-deep-500">{shortDate(competition.start_date)} ← {shortDate(competition.end_date)} · {arabicNumber(participants.length)} متسابق · {arabicNumber(competition.points_per_check)} نقطة لكل يوم{competition.completion_threshold ? ` · ⭐ عند ${arabicNumber(competition.completion_threshold)} نقطة` : ''}</p>
          {competition.description && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-deep-600">{competition.description}</p>}
        </div>
        {isAdmin && <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDialog('add')} disabled={competition.status === 'ended'} className="water-btn-outline min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-40">＋ متسابقون</button>
          <button type="button" onClick={() => setDialog('settings')} disabled={competition.status === 'ended'} className="water-btn-outline min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-40">الإعدادات</button>
          {competition.status === 'draft' && <button type="button" disabled={busy || participants.length === 0} onClick={() => changeStatus('active')} className="min-h-11 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40" title={participants.length === 0 ? 'أضف متسابقين أولاً' : undefined}>▶ إطلاق المسابقة</button>}
          {competition.status === 'active' && <button type="button" disabled={busy} onClick={() => setConfirm({ kind: 'end' })} className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white dark:bg-white dark:text-slate-900">إنهاء وتجميد النتائج</button>}
          {competition.status === 'ended' && <button type="button" disabled={busy} onClick={() => changeStatus('active')} className="water-btn-outline min-h-11 rounded-xl px-4 text-sm font-bold">إعادة فتح</button>}
        </div>}
      </div>
      {competition.status === 'draft' && isAdmin && <p className="mt-4 rounded-xl bg-water-50/70 p-3 text-sm text-deep-600 dark:bg-slate-800/50">المسابقة مسودة: لا يراها المشايخ ولا يعمل الرابط العام حتى تطلقها. {participants.length === 0 && 'ابدأ بإضافة المتسابقين.'}</p>}
      {competition.status === 'ended' && <p className="mt-4 rounded-xl bg-amber-50/70 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">انتهت المسابقة والنتائج مجمّدة.{isAdmin && ' أعد فتحها إن احتجت لتصحيح شيء.'}</p>}
    </section>

    {isAdmin && <section className="glass-card rounded-3xl p-5 sm:p-6" aria-labelledby="public-link-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="public-link-title" className="font-bold text-deep-900">لوحة المتصدرين العامة</h2><p className="mt-1 text-xs leading-5 text-deep-500">رابط يفتحه أي شخص دون تسجيل دخول. يعرض {competition.name_display === 'short' ? 'الاسم الأول وأول حرف من الثاني' : 'الأسماء كاملة'}{competition.show_photos ? ' مع صور الطلاب' : ''} و{competition.public_limit ? `أول ${arabicNumber(competition.public_limit)} مراكز` : 'كل من لديه نقاط'} فقط.</p></div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold"><input type="checkbox" role="switch" checked={competition.public_enabled} disabled={busy} onChange={e => setLink(e.target.checked)} className="h-5 w-5 accent-amber-500" />{competition.public_enabled ? 'مفعّل' : 'متوقف'}</label>
      </div>
      {competition.public_enabled && shareUrl && <div className="mt-4 space-y-3">
        {competition.status === 'draft' && <p className="text-xs text-amber-700 dark:text-amber-300">سيعمل الرابط فور إطلاق المسابقة.</p>}
        <div className="flex flex-col gap-2 sm:flex-row"><input readOnly dir="ltr" value={shareUrl} onFocus={e => e.target.select()} aria-label="الرابط العام" className="surface-field min-h-11 flex-1 rounded-xl px-3 text-sm" /><div className="flex gap-2"><button type="button" onClick={copyLink} className="water-btn min-h-11 flex-1 rounded-xl px-4 text-sm font-bold text-white">نسخ</button><a href={shareUrl} target="_blank" rel="noreferrer" className="water-btn-outline grid min-h-11 flex-1 place-items-center rounded-xl px-4 text-sm font-bold">فتح</a><button type="button" onClick={() => setShowQr(v => !v)} aria-expanded={showQr} className="water-btn-outline min-h-11 flex-1 rounded-xl px-4 text-sm font-bold">QR</button></div></div>
        {showQr && <div className="rounded-2xl bg-white p-4"><RegistrationQr url={shareUrl} className="mx-auto h-56 w-56 max-w-full" /></div>}
        <button type="button" disabled={busy} onClick={() => setLink(true, true)} className="text-xs font-bold text-red-600 dark:text-red-400">إنشاء رابط جديد وإبطال القديم</button>
      </div>}
    </section>}

    <div className="flex rounded-xl border border-water-200 bg-white/50 p-1 dark:bg-slate-900/50" role="tablist">{tabs.map(item => <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)} className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-bold transition ${tab === item.key ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-cyan-300' : 'text-deep-500'}`}>{item.label}</button>)}</div>

    {participants.length === 0 ? <div className="glass-card rounded-3xl px-6 py-12 text-center"><h2 className="font-bold text-deep-800">لا يوجد متسابقون بعد</h2><p className="mt-2 text-sm text-deep-500">{isAdmin ? 'أضف حلقة كاملة أو تصنيفاً بضغطة واحدة.' : 'سيضيف المدير المتسابقين قريباً.'}</p>{isAdmin && <button onClick={() => setDialog('add')} className="water-btn mt-5 min-h-11 rounded-xl px-6 text-sm font-bold text-white">إضافة المتسابقين</button>}</div>
      : tab === 'day' ? <section className="glass-card rounded-3xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="اليوم السابق" disabled={day <= competition.start_date} onClick={() => setDay(addDays(day, -1))} className="water-btn-outline grid h-11 w-11 place-items-center rounded-xl text-lg disabled:opacity-30">→</button>
            <label className="text-center"><span className="block text-xs text-deep-500">{day === today ? 'اليوم' : getArabicDay(day)}</span><input type="date" value={day} min={competition.start_date} max={latestAllowed} onChange={e => e.target.value && setDay(clampDay(e.target.value, competition.start_date, latestAllowed))} className="surface-field mt-1 min-h-10 rounded-lg px-2 text-sm font-bold" aria-label="تاريخ التسجيل" /></label>
            <button type="button" aria-label="اليوم التالي" disabled={day >= latestAllowed} onClick={() => setDay(addDays(day, 1))} className="water-btn-outline grid h-11 w-11 place-items-center rounded-xl text-lg disabled:opacity-30">←</button>
          </div>
          <p className="text-sm font-bold text-deep-700" aria-live="polite">{arabicNumber(doneCount)} / {arabicNumber(participants.length)} أنجزوا</p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input aria-label="ابحث عن متسابق" placeholder="ابحث بالاسم…" value={query} onChange={e => setQuery(e.target.value)} className="surface-field min-h-11 flex-1 rounded-xl px-3 text-sm" />
          {canRecord && <div className="flex gap-2"><button type="button" onClick={() => record(markable.filter(p => !done.has(entryKey(p.id, day))).map(p => p.id), day, true)} disabled={!markable.some(p => !done.has(entryKey(p.id, day)))} className="water-btn min-h-11 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-bold text-white disabled:opacity-40">✓ تحديد الكل</button><button type="button" onClick={() => record(markable.filter(p => done.has(entryKey(p.id, day))).map(p => p.id), day, false)} disabled={!markable.some(p => done.has(entryKey(p.id, day)))} className="water-btn-outline min-h-11 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-bold disabled:opacity-40">إلغاء الكل</button></div>}
        </div>
        {!canRecord && <p className="mt-3 text-xs text-deep-500">{competition.status === 'draft' ? 'يبدأ التسجيل بعد إطلاق المسابقة.' : 'انتهت المسابقة؛ التسجيل مغلق.'}</p>}
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">{visible.map(p => {
          const key = entryKey(p.id, day), checked = done.has(key), saving = pending.has(key), enabled = canRecord && p.can_record
          return <li key={p.id}><button type="button" aria-pressed={checked} disabled={!enabled || saving} onClick={() => record([p.id], day, !checked)} className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-right transition ${checked ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40' : 'border-water-200 bg-white/50 hover:border-amber-300 dark:bg-slate-900/40'} ${!enabled ? 'cursor-default opacity-60' : ''}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${checked ? 'bg-emerald-500 text-white' : 'border-2 border-water-300 text-transparent'}`} aria-hidden="true">✓</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-deep-900">{p.name}</span>{!p.can_record && <span className="block text-[11px] text-deep-500">ليس من طلابك</span>}</span>
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-water-200 border-t-water-600" aria-label="جاري الحفظ" />}
          </button></li>
        })}</ul>
      </section>
      : tab === 'grid' ? <GridView detail={detail} done={done} pending={pending} canRecord={canRecord} today={today} onToggle={(id, date, value) => record([id], date, value)} />
      : <StandingsView standings={standings} threshold={competition.completion_threshold} isAdmin={isAdmin && competition.status !== 'ended'} onRemove={(id, name) => setConfirm({ kind: 'remove', id, name })} />}

    {dialog === 'settings' && <CompetitionFormDialog competition={competition} onClose={() => setDialog(null)} onSaved={async () => { setDialog(null); await load(true); flash('تم حفظ الإعدادات') }} />}
    {dialog === 'add' && <AddCompetitorsDialog competitionId={competition.id} existingStudentIds={new Set(participants.flatMap(p => p.student_id === null ? [] : [p.student_id]))} onClose={() => setDialog(null)} onSaved={async message => { await load(true); flash(message) }} />}
    <ConfirmDialog open={confirm?.kind === 'end'} title="إنهاء المسابقة؟" message="ستُجمَّد النتائج ويُغلق التسجيل، وتتحول اللوحة العامة إلى النتائج النهائية. يمكنك إعادة فتحها لاحقاً." confirmLabel="إنهاء المسابقة" onConfirm={() => changeStatus('ended')} onClose={() => setConfirm(null)} />
    <ConfirmDialog open={confirm?.kind === 'remove'} busy={busy} title="إزالة المتسابق؟" message={confirm?.kind === 'remove' ? `ستُحذف كل أيام ${confirm.name} المسجلة في هذه المسابقة نهائياً.` : ''} confirmLabel="إزالة" onConfirm={() => confirm?.kind === 'remove' && removeParticipant(confirm.id)} onClose={() => setConfirm(null)} />
  </div>
}

function GridView({ detail, done, pending, canRecord, today, onToggle }: { detail: CompetitionDetail; done: Set<string>; pending: Set<string>; canRecord: boolean; today: string; onToggle: (participantId: number, date: string, value: boolean) => void }) {
  const { competition, participants, standings } = detail
  const days = elapsedDays(competition.start_date, competition.end_date, addDays(today, 1))
  const points = new Map(standings.map(row => [row.participant_id, row.points]))
  if (!days.length) return <div className="glass-card rounded-3xl p-10 text-center text-sm text-deep-500">لم تبدأ المسابقة بعد. يبدأ الجدول في {shortDate(competition.start_date)}.</div>
  return <section className="glass-card rounded-3xl p-3 sm:p-5">
    <ScrollableTable>
      <table className="min-w-full border-separate border-spacing-0 text-sm" aria-label="جدول أيام المسابقة">
        <thead><tr><th scope="col" className="sticky right-0 z-10 bg-white/95 px-3 py-2 text-right text-xs font-bold text-deep-600 dark:bg-slate-900/95">المتسابق</th><th scope="col" className="px-2 py-2 text-xs font-bold text-deep-600">النقاط</th>{days.map(d => <th key={d} scope="col" className={`whitespace-nowrap px-1 py-2 text-[11px] font-semibold ${d === today ? 'text-amber-600' : 'text-deep-500'}`}>{shortDate(d)}</th>)}</tr></thead>
        <tbody>{participants.map(p => <tr key={p.id} className="border-t border-water-100">
          <th scope="row" className="sticky right-0 z-10 max-w-[10rem] truncate bg-white/95 px-3 py-1.5 text-right font-bold text-deep-800 dark:bg-slate-900/95">{p.name}</th>
          <td className="px-2 text-center font-bold text-deep-700">{arabicNumber(points.get(p.id) ?? 0)}</td>
          {days.map(d => { const key = entryKey(p.id, d), checked = done.has(key), enabled = canRecord && p.can_record && !pending.has(key)
            return <td key={d} className="p-0.5 text-center"><button type="button" aria-label={`${p.name} — ${d}: ${checked ? 'أنجز' : 'لم يُسجل'}`} aria-pressed={checked} disabled={!enabled} onClick={() => onToggle(p.id, d, !checked)} className={`h-9 w-9 rounded-lg text-sm font-bold transition ${checked ? 'bg-emerald-500 text-white' : 'bg-water-50 text-transparent hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700'} ${!enabled ? 'cursor-default' : ''}`}>✓</button></td> })}
        </tr>)}</tbody>
      </table>
    </ScrollableTable>
  </section>
}

export function Podium({ rows, showPhotos = false }: { rows: { name: string; points: number; trophy: CompetitionStanding['trophy']; rank: number; completed?: boolean; photo?: string | null }[]; showPhotos?: boolean }) {
  const podium = podiumOrder(rows)
  if (!podium.length) return null
  const heights: Record<string, string> = { gold: 'h-28 sm:h-32', silver: 'h-20 sm:h-24', bronze: 'h-14 sm:h-16' }
  return <ol className="flex items-end justify-center gap-2 sm:gap-4" aria-label="منصة التتويج">{podium.map((row, index) => row.trophy && <li key={`${row.name}-${index}`} className="flex w-1/3 max-w-[11rem] flex-col items-center text-center">
    <TrophyCup trophy={row.trophy} labelled className={row.trophy === 'gold' ? 'h-16 w-16 drop-shadow-lg sm:h-20 sm:w-20' : 'h-12 w-12 sm:h-14 sm:w-14'} />
    {showPhotos && <StudentAvatar photo={row.photo} name={row.name} className={`mt-2 ring-4 ${TROPHY_META[row.trophy].ring} ${row.trophy === 'gold' ? 'h-20 w-20 text-2xl sm:h-24 sm:w-24' : 'h-14 w-14 text-lg sm:h-16 sm:w-16'}`} />}
    <span className="mt-2 line-clamp-2 text-sm font-extrabold text-deep-900 sm:text-base">{row.name}{row.completed && <span className="mr-1" title="أتم المسابقة">⭐</span>}</span>
    <span className={`text-xs font-bold ${TROPHY_META[row.trophy].text}`}>{arabicNumber(row.points)} نقطة</span>
    <span className={`mt-2 grid w-full place-items-center rounded-t-2xl ${heights[row.trophy]} ${row.trophy === 'gold' ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950' : row.trophy === 'silver' ? 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-800' : 'bg-gradient-to-b from-orange-300 to-orange-500 text-orange-950'} text-2xl font-black`}>{arabicNumber(row.rank)}</span>
  </li>)}</ol>
}

function StandingsView({ standings, threshold, isAdmin, onRemove }: { standings: CompetitionStanding[]; threshold: number | null; isAdmin: boolean; onRemove: (id: number, name: string) => void }) {
  const anyPoints = standings.some(row => row.points > 0)
  return <section className="glass-card space-y-6 rounded-3xl p-4 sm:p-6">
    {anyPoints ? <Podium rows={standings} /> : <p className="py-6 text-center text-sm text-deep-500">لم تُسجل أي نقاط بعد. ستظهر منصة التتويج مع أول تسجيل.</p>}
    <ScrollableTable>
      <table className="min-w-full text-sm" aria-label="ترتيب المتسابقين">
        <thead><tr className="text-xs text-deep-500"><th scope="col" className="px-2 py-2 text-right">المركز</th><th scope="col" className="px-2 py-2 text-right">المتسابق</th><th scope="col" className="px-2 py-2">النقاط</th><th scope="col" className="px-2 py-2">الأيام</th><th scope="col" className="px-2 py-2">أطول سلسلة</th>{threshold && <th scope="col" className="px-2 py-2">الإتمام</th>}{isAdmin && <th scope="col" className="px-2 py-2"><span className="sr-only">إجراءات</span></th>}</tr></thead>
        <tbody>{standings.map(row => <tr key={row.participant_id} className="border-t border-water-100">
          <td className="px-2 py-2"><span className="flex items-center gap-1.5 font-bold text-deep-700">{row.trophy ? <TrophyCup trophy={row.trophy} labelled className="h-6 w-6" /> : <span className="inline-block w-6" />}{arabicNumber(row.rank)}</span></td>
          <th scope="row" className="px-2 py-2 text-right font-bold text-deep-900">{row.name}{row.student_id === null && <span className="mr-2 text-[11px] font-normal text-deep-500">(طالب محذوف)</span>}</th>
          <td className="px-2 py-2 text-center font-extrabold text-deep-900">{arabicNumber(row.points)}</td>
          <td className="px-2 py-2 text-center text-deep-600">{arabicNumber(row.days)}</td>
          <td className="px-2 py-2 text-center text-deep-600">{arabicNumber(row.best_streak)}</td>
          {threshold && <td className="px-2 py-2 text-center">{row.completed ? <span title="أتم المسابقة">⭐</span> : <span className="text-xs text-deep-400">{arabicNumber(Math.max(0, threshold - row.points))} متبقية</span>}</td>}
          {isAdmin && <td className="px-2 py-2 text-left"><button type="button" onClick={() => onRemove(row.participant_id, row.name)} className="min-h-9 rounded-lg px-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40" aria-label={`إزالة ${row.name}`}>إزالة</button></td>}
        </tr>)}</tbody>
      </table>
    </ScrollableTable>
  </section>
}

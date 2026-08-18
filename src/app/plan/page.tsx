'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { SURAHS, surahInfo } from '@/lib/quran'
import { completedMushafText, generateQuranPlan, type GeneratedQuranPlan, type QuranAssignment, type QuranPlanTrack } from '@/lib/quran-plan'

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const TRACK_STYLES = [
  { border: 'border-emerald-200 dark:border-emerald-900', background: 'bg-emerald-50/45 dark:bg-emerald-950/20', toggle: 'bg-emerald-600', text: 'text-emerald-700 dark:text-emerald-300', soft: '#dcfce7', ink: '#166534', line: '#22c55e', emoji: '🟢' },
  { border: 'border-violet-200 dark:border-violet-900', background: 'bg-violet-50/45 dark:bg-violet-950/20', toggle: 'bg-violet-600', text: 'text-violet-700 dark:text-violet-300', soft: '#f3e8ff', ink: '#6b21a8', line: '#a855f7', emoji: '🟣' },
  { border: 'border-amber-200 dark:border-amber-900', background: 'bg-amber-50/45 dark:bg-amber-950/20', toggle: 'bg-amber-600', text: 'text-amber-700 dark:text-amber-300', soft: '#fef3c7', ink: '#92400e', line: '#f59e0b', emoji: '🟠' },
  { border: 'border-sky-200 dark:border-sky-900', background: 'bg-sky-50/45 dark:bg-sky-950/20', toggle: 'bg-sky-600', text: 'text-sky-700 dark:text-sky-300', soft: '#e0f2fe', ink: '#075985', line: '#0ea5e9', emoji: '🔵' },
  { border: 'border-rose-200 dark:border-rose-900', background: 'bg-rose-50/45 dark:bg-rose-950/20', toggle: 'bg-rose-600', text: 'text-rose-700 dark:text-rose-300', soft: '#ffe4e6', ink: '#9f1239', line: '#f43f5e', emoji: '🔴' },
]

function localIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function initialDates() {
  const start = new Date()
  const end = new Date(start)
  end.setDate(end.getDate() + 29)
  return { start: localIso(start), end: localIso(end) }
}

function defaultTrack(id: string, name: string, dailyAmount: number): QuranPlanTrack {
  return { id, name, enabled: true, kind: 'quran', start: { surah: 1, ayah: 1 }, unit: 'ayahs', subject: '', quantityUnit: 'صفحة', startNumber: 1, dailyAmount }
}

function displayDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day, 12))
}

function amountLabel(track: QuranPlanTrack, amount: number) {
  if (track.kind === 'quantity') return `${amount} ${track.quantityUnit}`
  const unitLabels: Record<QuranPlanTrack['unit'], [string, string]> = {
    ayahs: ['آية', 'آيات'],
    lines: ['سطر', 'أسطر'],
    juz: ['جزء', 'أجزاء'],
    hizb: ['حزب', 'أحزاب'],
    quarter: ['ربع', 'أرباع'],
    page: ['صفحة', 'صفحات'],
    half_page: ['نصف صفحة', 'أنصاف صفحات'],
  }
  return `${amount} ${unitLabels[track.unit][amount === 1 ? 0 : 1]}`
}

function TrackFields({ track, index, count, onChange, onMove, onRemove }: {
  track: QuranPlanTrack
  index: number
  count: number
  onChange(value: QuranPlanTrack): void
  onMove(direction: -1 | 1): void
  onRemove(): void
}) {
  const style = TRACK_STYLES[index % TRACK_STYLES.length]
  const ayahCount = surahInfo(track.start.surah).ayahs
  return <fieldset className={`rounded-2xl border p-4 ${style.border} ${style.background}`}>
    <div className="flex flex-wrap items-center gap-3">
      <input value={track.name} onChange={event => onChange({ ...track, name: event.target.value })} required maxLength={40} aria-label="اسم البند" className="surface-field min-w-0 flex-1 rounded-xl px-3 py-2 text-base font-bold" />
      <div className="flex items-center gap-1">
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} title="تحريك لأعلى" className="water-btn-outline grid h-8 w-8 place-items-center rounded-lg disabled:opacity-30">↑</button>
        <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} title="تحريك لأسفل" className="water-btn-outline grid h-8 w-8 place-items-center rounded-lg disabled:opacity-30">↓</button>
        <button type="button" onClick={onRemove} className="grid h-8 place-items-center rounded-lg px-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30">حذف</button>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-deep-600">
        مفعّل
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${track.enabled ? style.toggle : 'bg-slate-300 dark:bg-slate-700'}`}>
          <input type="checkbox" checked={track.enabled} onChange={event => onChange({ ...track, enabled: event.target.checked })} className="sr-only" />
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${track.enabled ? 'right-6' : 'right-1'}`} />
        </span>
      </label>
    </div>

    {track.enabled && <>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white/45 p-1 dark:bg-slate-900/35" role="group" aria-label="نوع البند">
        <button type="button" onClick={() => onChange({ ...track, kind: 'quran' })} className={`rounded-lg px-3 py-2 text-xs font-bold ${track.kind === 'quran' ? `${style.toggle} text-white` : 'text-deep-500'}`}>ورد قرآني</button>
        <button type="button" onClick={() => onChange({ ...track, kind: 'quantity' })} className={`rounded-lg px-3 py-2 text-xs font-bold ${track.kind === 'quantity' ? `${style.toggle} text-white` : 'text-deep-500'}`}>مادة أخرى</button>
      </div>

      {track.kind === 'quran' ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem]">
        <label className="text-xs font-semibold text-deep-700">سورة البداية
          <select value={track.start.surah} onChange={event => onChange({ ...track, start: { surah: Number(event.target.value), ayah: 1 } })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal">
            {SURAHS.map(surah => <option key={surah.number} value={surah.number}>{surah.number}. {surah.name} — {surah.ayahs} آية</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-deep-700">آية البداية
          <select value={Math.min(track.start.ayah, ayahCount)} onChange={event => onChange({ ...track, start: { ...track.start, ayah: Number(event.target.value) } })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal">
            {Array.from({ length: ayahCount }, (_, index) => index + 1).map(ayah => <option key={ayah} value={ayah}>{ayah}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-deep-700">الوحدة
          <select value={track.unit} onChange={event => onChange({ ...track, unit: event.target.value as QuranPlanTrack['unit'] })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal"><option value="ayahs">آيات</option><option value="lines">أسطر</option><option value="juz">جزء</option><option value="hizb">حزب</option><option value="quarter">ربع</option><option value="page">صفحة</option><option value="half_page">نصف صفحة</option></select>
        </label>
        <label className="text-xs font-semibold text-deep-700">المعدل اليومي
          <input type="number" min={1} max={1000} required value={track.dailyAmount} onChange={event => onChange({ ...track, dailyAmount: Number(event.target.value) })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal" />
        </label>
      </div> : <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_8rem_7rem_7rem]">
        <label className="text-xs font-semibold text-deep-700">المادة أو اسم الكتاب
          <input value={track.subject} onChange={event => onChange({ ...track, subject: event.target.value })} required maxLength={100} placeholder="مثال: كتاب الرحيق المختوم" className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-deep-700">اسم الوحدة
          <input value={track.quantityUnit} onChange={event => onChange({ ...track, quantityUnit: event.target.value })} required maxLength={20} placeholder="صفحة" className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-deep-700">رقم البداية
          <input type="number" min={1} required value={track.startNumber} onChange={event => onChange({ ...track, startNumber: Number(event.target.value) })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-deep-700">المعدل اليومي
          <input type="number" min={1} required value={track.dailyAmount} onChange={event => onChange({ ...track, dailyAmount: Number(event.target.value) })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal" />
        </label>
      </div>}
    </>}
  </fieldset>
}

export default function QuranPlanPage() {
  const defaults = useMemo(initialDates, [])
  const [studentName, setStudentName] = useState('')
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4])
  const [tracks, setTracks] = useState<QuranPlanTrack[]>([defaultTrack('memorization', 'الحفظ', 5), defaultTrack('revision', 'المراجعة', 20)])
  const [plan, setPlan] = useState<GeneratedQuranPlan | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const updateTrack = (id: string, value: QuranPlanTrack) => setTracks(current => current.map(track => track.id === id ? value : track))
  const moveTrack = (index: number, direction: -1 | 1) => setTracks(current => {
    const next = [...current]
    const target = index + direction
    if (target < 0 || target >= next.length) return current
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const addTrack = (kind: 'quran' | 'quantity') => {
    const id = `custom-${Date.now()}-${tracks.length}`
    setTracks(current => [...current, kind === 'quran'
      ? defaultTrack(id, 'بند جديد', 5)
      : { ...defaultTrack(id, 'قراءة', 10), kind: 'quantity', subject: '', quantityUnit: 'صفحة' }])
  }

  const build = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setCopied(false)
    try {
      setPlan(generateQuranPlan({ startDate, endDate, weekdays, tracks }))
      setTimeout(() => document.getElementById('plan-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : ''
      setPlan(null)
      setError(code === 'plan_period_too_long' ? 'أقصى مدة للخطة سنتان.' : code === 'study_days_required' ? 'اختر يوم دراسة واحداً على الأقل.' : code === 'track_required' ? 'فعّل بنداً واحداً على الأقل.' : code === 'invalid_date_range' ? 'تاريخ النهاية يجب أن يساوي أو يلي تاريخ البداية.' : 'راجع أسماء البنود ونقاط البداية والمعدلات اليومية.')
    }
  }

  const planText = () => {
    if (!plan) return ''
    const lines = ['🌿 *الخطة اليومية* 🌿', ...(studentName.trim() ? [`👤 *الطالب:* ${studentName.trim()}`] : []), `📅 *الفترة:* ${displayDate(startDate)} إلى ${displayDate(endDate)}`, `🗓️ *أيام الدراسة:* ${[...weekdays].sort((a, b) => a - b).map(day => WEEKDAYS[day]).join('، ')}`]
    plan.tracks.forEach((track, index) => lines.push(`${TRACK_STYLES[index % TRACK_STYLES.length].emoji} *معدل ${track.name}:* ${amountLabel(track, track.dailyAmount)} يومياً`))
    lines.push('', '━━━━━━━━━━━━━━━━━━', '')
    plan.days.forEach(day => {
      lines.push(`📌 *${WEEKDAYS[day.weekday]} — ${displayDate(day.date)}*`)
      if (!day.isStudyDay) lines.push('🌙 راحة')
      else plan.tracks.forEach((track, index) => {
        const assignment = day.assignments[track.id]
        lines.push(`${TRACK_STYLES[index % TRACK_STYLES.length].emoji} *${track.name}:* ${assignment ? `${assignment.text} _(${amountLabel(track, assignment.unitAmount)})_` : 'اكتمل الورد ✅'}`)
      })
      lines.push('', '──────────────────', '')
    })
    lines.push('🤲 *وفقكم الله وبارك في علمكم وعملكم*')
    return lines.join('\n')
  }

  const printTitle = studentName.trim() ? `${studentName.trim()} - خطة - ${startDate}` : `الخطة اليومية - ${startDate}`
  const printPlan = () => {
    const previousTitle = document.title
    document.title = printTitle
    window.addEventListener('afterprint', () => { document.title = previousTitle }, { once: true })
    window.print()
  }

  const assignmentCell = (track: QuranPlanTrack, assignment: QuranAssignment | null, isStudyDay: boolean) => {
    if (!isStudyDay) return 'راحة'
    if (!assignment) return 'اكتمل الورد'
    return <><span>{assignment.text}</span><span className="mr-1 text-xs">({amountLabel(track, assignment.unitAmount)}){assignment.to ? completedMushafText(assignment.to) : ''}</span></>
  }

  return <div className="min-h-screen bg-[rgb(var(--bg))] px-3 py-6 sm:px-5 sm:py-10"><div className="mx-auto max-w-6xl">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-lg font-bold text-cyan-700 dark:text-cyan-300">💧 زمزم</Link><span className="rounded-full border border-water-200 bg-white/60 px-3 py-1.5 text-xs font-semibold text-deep-600 dark:border-slate-700 dark:bg-slate-900/60">أداة مستقلة · لا تحفظ بيانات</span></header>
    <section className="glass-strong overflow-hidden rounded-3xl">
      <div className="bg-gradient-to-l from-cyan-700 to-teal-600 px-5 py-7 text-white sm:px-8"><p className="text-sm font-semibold text-cyan-100">مولّد خطة يومية</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">إنشاء خطة مخصصة للطالب</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/90">أضف أوراداً قرآنية أو مواد أخرى مثل قراءة كتاب أو سماع دروس، وحدد المعدل المستقل لكل بند.</p></div>
      <form onSubmit={build} className="space-y-5 p-4 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-semibold text-deep-700">اسم الطالب <span className="font-normal text-deep-400">(اختياري)</span><input value={studentName} onChange={event => setStudentName(event.target.value)} maxLength={100} placeholder="يظهر في الخطة المطبوعة" className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" /></label>
          <label className="text-sm font-semibold text-deep-700">تاريخ البداية<input type="date" required value={startDate} onChange={event => { setStartDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value) }} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" /></label>
          <label className="text-sm font-semibold text-deep-700">تاريخ النهاية<input type="date" required min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" /></label>
        </div>
        <fieldset><legend className="text-sm font-bold text-deep-800">أيام الدراسة</legend><div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{WEEKDAYS.map((day, index) => { const selected = weekdays.includes(index); return <label key={day} className={`cursor-pointer rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition ${selected ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-water-200 bg-white/50 text-deep-600 dark:border-slate-700 dark:bg-slate-900/50'}`}><input type="checkbox" checked={selected} onChange={() => setWeekdays(current => selected ? current.filter(item => item !== index) : [...current, index])} className="sr-only" />{day}</label> })}</div></fieldset>
        <div className="space-y-4">{tracks.map((track, index) => <TrackFields key={track.id} track={track} index={index} count={tracks.length} onChange={value => updateTrack(track.id, value)} onMove={direction => moveTrack(index, direction)} onRemove={() => setTracks(current => current.filter(item => item.id !== track.id))} />)}</div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => addTrack('quran')} className="water-btn-outline rounded-xl px-4 py-2 text-sm font-bold">+ إضافة ورد قرآني</button><button type="button" onClick={() => addTrack('quantity')} className="water-btn-outline rounded-xl px-4 py-2 text-sm font-bold">+ إضافة مادة أخرى</button></div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/35 dark:text-red-200">{error}</p>}
        <button type="submit" className="water-btn w-full rounded-xl px-5 py-3.5 font-bold text-white sm:w-auto">إنشاء الخطة</button>
      </form>
    </section>

    {plan && <section id="plan-preview" className="print-plan mt-7 scroll-mt-5 rounded-3xl border border-water-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-7">
      <div className="flex flex-col gap-4 border-b border-water-200 pb-5 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between"><div><p className="plan-kicker text-xs font-bold text-cyan-700 dark:text-cyan-300">بسم الله الرحمن الرحيم</p><h2 className="plan-title mt-2 text-2xl font-bold text-deep-900">{printTitle}</h2><p className="plan-period mt-2 text-sm text-deep-500">من {displayDate(startDate)} إلى {displayDate(endDate)}</p></div><div className="no-print flex flex-wrap gap-2"><button type="button" onClick={async () => { await navigator.clipboard.writeText(planText()); setCopied(true) }} className="water-btn-outline rounded-xl px-4 py-2 text-sm font-semibold">{copied ? 'تم النسخ ✓' : 'نسخ النص'}</button><button type="button" onClick={printPlan} className="water-btn rounded-xl px-4 py-2 text-sm font-bold text-white">طباعة الخطة</button></div></div>
      <div className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div className="plan-stat-days rounded-xl bg-cyan-50 p-3 text-center dark:bg-cyan-950/35"><strong className="block text-xl text-cyan-800 dark:text-cyan-200">{plan.studyDays}</strong><span className="text-xs text-cyan-700 dark:text-cyan-300">يوم دراسة</span></div>{plan.tracks.map((track, index) => { const style = TRACK_STYLES[index % TRACK_STYLES.length]; return <div key={track.id} className="rounded-xl p-3 text-center" style={{ backgroundColor: style.soft, color: style.ink }}><strong className="block text-xl">{plan.totals[track.id].amount}</strong><span className="text-xs">{track.name} · {track.kind === 'quantity' ? track.quantityUnit : amountLabel(track, 1).replace(/^1 /, '')}</span></div> })}</div>
      <div className="overflow-x-auto rounded-2xl border border-water-200 dark:border-slate-700"><table className="plan-table w-full border-collapse text-right text-sm" style={{ minWidth: `${Math.max(44, 18 + plan.tracks.length * 14)}rem` }}><thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100"><tr><th className="px-4 py-3">التاريخ</th><th className="px-4 py-3">اليوم</th>{plan.tracks.map(track => <th key={track.id} className="px-4 py-3">{track.name}</th>)}</tr></thead><tbody className="divide-y divide-water-100 dark:divide-slate-800">{plan.days.map(day => <tr key={day.date} className={day.isStudyDay ? 'plan-study-row bg-white dark:bg-slate-900' : 'plan-rest-row bg-slate-50/75 text-slate-500 dark:bg-slate-950/45 dark:text-slate-400'}><td className="whitespace-nowrap px-4 py-3">{displayDate(day.date)}</td><td className="px-4 py-3 font-semibold">{WEEKDAYS[day.weekday]}</td>{plan.tracks.map((track, index) => <td key={track.id} className="px-4 py-3" style={{ borderInlineStart: `3px solid ${TRACK_STYLES[index % TRACK_STYLES.length].line}` }}>{assignmentCell(track, day.assignments[track.id], day.isStudyDay)}</td>)}</tr>)}</tbody></table></div>
      <p className="mt-5 text-center text-xs text-deep-400">وُلدت الخطة بواسطة زمزم · يمكن تعديل المدخلات وإعادة إنشائها في أي وقت</p>
    </section>}
  </div></div>
}

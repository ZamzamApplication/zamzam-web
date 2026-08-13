'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { SURAHS, surahInfo } from '@/lib/quran'
import { completedMushafText, generateQuranPlan, type GeneratedQuranPlan, type QuranPlanTrack } from '@/lib/quran-plan'

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

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

function displayDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day, 12))
}

function TrackFields({ title, accent, value, onChange }: {
  title: string
  accent: 'cyan' | 'violet'
  value: QuranPlanTrack
  onChange(value: QuranPlanTrack): void
}) {
  const ayahCount = surahInfo(value.start.surah).ayahs
  const accentClass = accent === 'cyan'
    ? 'border-cyan-200 bg-cyan-50/45 dark:border-cyan-900 dark:bg-cyan-950/20'
    : 'border-violet-200 bg-violet-50/45 dark:border-violet-900 dark:bg-violet-950/20'
  return <fieldset className={`rounded-2xl border p-4 ${accentClass}`}>
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span><strong className="block text-base text-deep-900">{title}</strong><span className="mt-1 block text-xs text-deep-500">نقطة بداية ومعدل مستقل لكل يوم دراسة.</span></span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${value.enabled ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
        <input type="checkbox" checked={value.enabled} onChange={event => onChange({ ...value, enabled: event.target.checked })} className="peer sr-only" />
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${value.enabled ? 'right-6' : 'right-1'}`} />
      </span>
    </label>
    {value.enabled && <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem]">
      <label className="text-xs font-semibold text-deep-700">سورة البداية
        <select value={value.start.surah} onChange={event => onChange({ ...value, start: { surah: Number(event.target.value), ayah: 1 } })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal">
          {SURAHS.map(surah => <option key={surah.number} value={surah.number}>{surah.number}. {surah.name} — {surah.ayahs} آية</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-deep-700">آية البداية
        <select value={Math.min(value.start.ayah, ayahCount)} onChange={event => onChange({ ...value, start: { ...value.start, ayah: Number(event.target.value) } })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal">
          {Array.from({ length: ayahCount }, (_, index) => index + 1).map(ayah => <option key={ayah} value={ayah}>{ayah}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-deep-700">آيات يومياً
        <input type="number" min={1} max={1000} required value={value.dailyAyahs} onChange={event => onChange({ ...value, dailyAyahs: Number(event.target.value) })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal" />
      </label>
    </div>}
  </fieldset>
}

export default function QuranPlanPage() {
  const defaults = useMemo(initialDates, [])
  const [studentName, setStudentName] = useState('')
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4])
  const [memorization, setMemorization] = useState<QuranPlanTrack>({ enabled: true, start: { surah: 1, ayah: 1 }, dailyAyahs: 5 })
  const [revision, setRevision] = useState<QuranPlanTrack>({ enabled: true, start: { surah: 1, ayah: 1 }, dailyAyahs: 20 })
  const [plan, setPlan] = useState<GeneratedQuranPlan | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const build = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setCopied(false)
    try {
      setPlan(generateQuranPlan({ startDate, endDate, weekdays, memorization, revision }))
      setTimeout(() => document.getElementById('plan-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : ''
      setPlan(null)
      setError(code === 'plan_period_too_long' ? 'أقصى مدة للخطة سنتان.' : code === 'study_days_required' ? 'اختر يوم دراسة واحداً على الأقل.' : code === 'track_required' ? 'فعّل الحفظ أو المراجعة على الأقل.' : code === 'invalid_date_range' ? 'تاريخ النهاية يجب أن يساوي أو يلي تاريخ البداية.' : 'راجع نقطة البداية والمعدل اليومي.')
    }
  }

  const planText = () => {
    if (!plan) return ''
    const lines = [
      `خطة الحفظ والمراجعة${studentName.trim() ? ` — ${studentName.trim()}` : ''}`,
      `الفترة: ${displayDate(startDate)} إلى ${displayDate(endDate)}`,
      `أيام الدراسة: ${[...weekdays].sort((a, b) => a - b).map(day => WEEKDAYS[day]).join('، ')}`,
      '',
    ]
    plan.days.forEach(day => {
      const portions = !day.isStudyDay ? ['راحة'] : [
        ...(memorization.enabled ? [`الحفظ: ${day.memorization ? day.memorization.text : 'اكتمل المصحف'}`] : []),
        ...(revision.enabled ? [`المراجعة: ${day.revision ? day.revision.text : 'اكتمل المصحف'}`] : []),
      ]
      lines.push(`${WEEKDAYS[day.weekday]} ${displayDate(day.date)} — ${portions.join(' | ')}`)
    })
    return lines.join('\n')
  }

  return <div className="min-h-screen bg-[rgb(var(--bg))] px-3 py-6 sm:px-5 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-lg font-bold text-cyan-700 dark:text-cyan-300">💧 زمزم</Link>
        <span className="rounded-full border border-water-200 bg-white/60 px-3 py-1.5 text-xs font-semibold text-deep-600 dark:border-slate-700 dark:bg-slate-900/60">أداة مستقلة · لا تحفظ بيانات</span>
      </header>

      <section className="glass-strong overflow-hidden rounded-3xl">
        <div className="bg-gradient-to-l from-cyan-700 to-teal-600 px-5 py-7 text-white sm:px-8">
          <p className="text-sm font-semibold text-cyan-100">مولّد خطة قرآنية</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">إنشاء خطة حفظ ومراجعة يومية</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-50/90">حدّد الفترة وأيام الدراسة ونقطة البداية والمعدل. سيوزّع النظام الآيات بالتتابع، ويعبر بين السور تلقائياً، ويضع أيام الراحة داخل الخطة.</p>
        </div>

        <form onSubmit={build} className="space-y-5 p-4 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-semibold text-deep-700">اسم الطالب <span className="font-normal text-deep-400">(اختياري)</span>
              <input value={studentName} onChange={event => setStudentName(event.target.value)} maxLength={100} placeholder="يظهر في الخطة المطبوعة" className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" />
            </label>
            <label className="text-sm font-semibold text-deep-700">تاريخ البداية
              <input type="date" required value={startDate} onChange={event => { setStartDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value) }} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" />
            </label>
            <label className="text-sm font-semibold text-deep-700">تاريخ النهاية
              <input type="date" required min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" />
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-bold text-deep-800">أيام الدراسة</legend>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAYS.map((day, index) => {
                const selected = weekdays.includes(index)
                return <label key={day} className={`cursor-pointer rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition ${selected ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-water-200 bg-white/50 text-deep-600 dark:border-slate-700 dark:bg-slate-900/50'}`}>
                  <input type="checkbox" checked={selected} onChange={() => setWeekdays(current => selected ? current.filter(item => item !== index) : [...current, index])} className="sr-only" />{day}
                </label>
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 lg:grid-cols-2">
            <TrackFields title="الحفظ" accent="cyan" value={memorization} onChange={setMemorization} />
            <TrackFields title="المراجعة" accent="violet" value={revision} onChange={setRevision} />
          </div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/35 dark:text-red-200">{error}</p>}
          <button type="submit" className="water-btn w-full rounded-xl px-5 py-3.5 font-bold text-white sm:w-auto">إنشاء الخطة</button>
        </form>
      </section>

      {plan && <section id="plan-preview" className="print-plan mt-7 scroll-mt-5 rounded-3xl border border-water-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-7">
        <div className="flex flex-col gap-4 border-b border-water-200 pb-5 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-bold text-cyan-700 dark:text-cyan-300">بسم الله الرحمن الرحيم</p><h2 className="mt-2 text-2xl font-bold text-deep-900">خطة الحفظ والمراجعة{studentName.trim() ? ` — ${studentName.trim()}` : ''}</h2><p className="mt-2 text-sm text-deep-500">من {displayDate(startDate)} إلى {displayDate(endDate)}</p></div>
          <div className="no-print flex flex-wrap gap-2"><button type="button" onClick={async () => { await navigator.clipboard.writeText(planText()); setCopied(true) }} className="water-btn-outline rounded-xl px-4 py-2 text-sm font-semibold">{copied ? 'تم النسخ ✓' : 'نسخ النص'}</button><button type="button" onClick={() => window.print()} className="water-btn rounded-xl px-4 py-2 text-sm font-bold text-white">طباعة الخطة</button></div>
        </div>

        <div className="my-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-cyan-50 p-3 text-center dark:bg-cyan-950/35"><strong className="block text-xl text-cyan-800 dark:text-cyan-200">{plan.studyDays}</strong><span className="text-xs text-cyan-700 dark:text-cyan-300">يوم دراسة</span></div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/35"><strong className="block text-xl text-emerald-800 dark:text-emerald-200">{plan.memorizationAyahs}</strong><span className="text-xs text-emerald-700 dark:text-emerald-300">آية حفظ</span></div>
          <div className="rounded-xl bg-violet-50 p-3 text-center dark:bg-violet-950/35"><strong className="block text-xl text-violet-800 dark:text-violet-200">{plan.revisionAyahs}</strong><span className="text-xs text-violet-700 dark:text-violet-300">آية مراجعة</span></div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-water-200 dark:border-slate-700">
          <table className="w-full min-w-[44rem] border-collapse text-right text-sm">
            <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100"><tr><th className="px-4 py-3">التاريخ</th><th className="px-4 py-3">اليوم</th>{memorization.enabled && <th className="px-4 py-3">الحفظ</th>}{revision.enabled && <th className="px-4 py-3">المراجعة</th>}</tr></thead>
            <tbody className="divide-y divide-water-100 dark:divide-slate-800">
              {plan.days.map(day => <tr key={day.date} className={day.isStudyDay ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/75 text-slate-500 dark:bg-slate-950/45 dark:text-slate-400'}>
                <td className="whitespace-nowrap px-4 py-3">{displayDate(day.date)}</td><td className="px-4 py-3 font-semibold">{WEEKDAYS[day.weekday]}</td>
                {memorization.enabled && <td className="px-4 py-3">{day.isStudyDay ? day.memorization ? <><span>{day.memorization.text}</span><span className="mr-1 text-xs text-emerald-600">({day.memorization.ayahCount} آية){completedMushafText(day.memorization.to)}</span></> : 'اكتمل المصحف' : 'راحة'}</td>}
                {revision.enabled && <td className="px-4 py-3">{day.isStudyDay ? day.revision ? <><span>{day.revision.text}</span><span className="mr-1 text-xs text-violet-600">({day.revision.ayahCount} آية){completedMushafText(day.revision.to)}</span></> : 'اكتمل المصحف' : 'راحة'}</td>}
              </tr>)}
            </tbody>
          </table>
        </div>
        <p className="mt-5 text-center text-xs text-deep-400">وُلدت الخطة بواسطة زمزم · يمكن تعديل المدخلات وإعادة إنشائها في أي وقت</p>
      </section>}
    </div>
  </div>
}

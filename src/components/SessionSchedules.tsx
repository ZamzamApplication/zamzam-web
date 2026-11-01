'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { WEEKDAYS, schedulePayload } from '@/lib/session-schedules'
import type { SessionSchedule } from '@/lib/session-schedules'
import type { StudentCategory, StudentInfo } from '@/lib/types'

export function ScheduleForm({ schedule, onSaved }: { schedule?: SessionSchedule; onSaved: () => void }) {
  const [weekdays, setWeekdays] = useState<number[]>(schedule?.weekdays || [])
  const [start, setStart] = useState(schedule?.start_date || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10))
  const [end, setEnd] = useState(schedule?.end_date || '')
  const [name, setName] = useState(schedule?.name || '')
  const [timezone, setTimezone] = useState(schedule?.timezone || 'Africa/Cairo')
  const [mode, setMode] = useState<'all' | 'categories' | 'students'>(schedule?.membership_mode || 'all')
  const [ids, setIds] = useState<number[]>(schedule?.member_ids || [])
  const [multiple, setMultiple] = useState(false)
  const [categories, setCategories] = useState<StudentCategory[]>([])
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    api.getMe().then(async user => {
      const enabled = Boolean(user.tahfiz?.multiple_sessions_per_day_enabled)
      if (!live) return
      setMultiple(enabled)
      if (enabled) {
        const [c, s] = await Promise.all([api.getStudentCategories(), api.getStudents()])
        if (!live) return
        setCategories(c); setStudents(s.filter(v => ['مقيد', 'ضيف'].includes(v.status)))
      }
      if (live) setReady(true)
    }).catch(e => { if (live) setError(e.message || 'تعذر تحميل الخيارات') })
    return () => { live = false }
  }, [])
  const toggle = (id: number) => setIds(v => v.includes(id) ? v.filter(n => n !== id) : [...v, id])
  return <form className="space-y-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const input = { name: name.trim() || null, weekdays, start_date: start, end_date: end || null, timezone, membership_mode: multiple ? mode : 'all' as const, member_ids: multiple && mode !== 'all' ? ids : [], is_active: schedule?.is_active ?? true }
      if (schedule) await api.updateSessionSchedule(schedule.id, { ...input, expected_version: schedule.version })
      else await api.createSessionSchedule(input)
      onSaved()
    } catch (e: any) { setError(e.message || 'تعذر حفظ الجدول') } finally { setBusy(false) }
  }}>
    <label className="block text-sm">اسم الحلقة (اختياري)<input value={name} maxLength={100} onChange={e => setName(e.target.value)} className="surface-field mt-1 w-full rounded-xl p-3" /></label>
    <fieldset><legend className="mb-2 text-sm font-bold">أيام الحلقة</legend><div className="flex flex-wrap gap-2">{WEEKDAYS.map((day, index) => <button key={day} type="button" aria-pressed={weekdays.includes(index)} onClick={() => setWeekdays(v => v.includes(index) ? v.filter(d => d !== index) : [...v, index].sort())} className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${weekdays.includes(index) ? 'water-btn text-white' : 'water-btn-outline'}`}>{day}</button>)}</div></fieldset>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm">بدءاً من<input type="date" required value={start} onChange={e => setStart(e.target.value)} className="surface-field mt-1 w-full rounded-xl p-2" /></label>
      <label className="text-sm">حتى (اختياري)<input type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} className="surface-field mt-1 w-full rounded-xl p-2" /></label>
    </div>
    <label className="block text-sm">المنطقة الزمنية<input required dir="ltr" value={timezone} maxLength={64} onChange={e => setTimezone(e.target.value)} className="surface-field mt-1 w-full rounded-xl p-2" /><span className="text-xs text-deep-500">مثال: Africa/Cairo أو Asia/Riyadh</span></label>
    {multiple && <><label className="block text-sm">طلاب الحلقة<select value={mode} onChange={e => { setMode(e.target.value as typeof mode); setIds([]) }} className="surface-field mt-1 w-full rounded-xl p-3"><option value="all">كل الطلاب النشطين</option><option value="categories">حسب التصنيف (يتحدث تلقائياً)</option><option value="students">طلاب محددون</option></select></label>
      {mode !== 'all' && <div className="max-h-48 overflow-y-auto rounded-xl border border-water-200 p-3">{(mode === 'categories' ? categories : students).map(v => <label key={v.id} className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" checked={ids.includes(v.id)} onChange={() => toggle(v.id)} />{v.name}</label>)}</div>}</>}
    <p className="rounded-xl bg-cyan-50 p-3 text-sm text-deep-700 dark:bg-cyan-950/30" aria-live="polite">{weekdays.length ? `تُنشأ حلقة كل ${weekdays.map(d => WEEKDAYS[d]).join(' و')} بدءاً من ${start}${end ? ` حتى ${end}` : ' دون تاريخ انتهاء'}.` : 'اختر أيام الحلقة الأسبوعية.'} تُجهّز الحلقات قبل موعدها بأسبوع، ويظل تسجيل الحضور والتأكيد يدوياً.</p>
    {schedule && <p className="text-xs text-deep-500">التعديل والإيقاف يؤثران على الإنشاء القادم. الحلقات المنشأة تبقى كما هي؛ يمكنك تخطي موعد لم يبدأ تسجيله من القائمة.</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <button disabled={!ready || busy || !weekdays.length || (multiple && mode !== 'all' && !ids.length)} className="water-btn min-h-11 w-full rounded-xl p-3 text-white disabled:opacity-50">{busy ? 'جاري الحفظ...' : 'حفظ الجدول الأسبوعي'}</button>
  </form>
}

export default function SessionSchedules({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<SessionSchedule[]>([])
  const [editing, setEditing] = useState<SessionSchedule | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => { try { setRows(await api.getSessionSchedules()); setError('') } catch (e: any) { setError(e.message || 'تعذر تحميل الجداول') } }, [])
  useEffect(() => { void load() }, [load])
  const change = async (operation: () => Promise<unknown>) => {
    setBusy(true); setError('')
    try { await operation(); await load(); onChanged() } catch (e: any) { setError(e.message || 'تعذر تعديل الجدول') } finally { setBusy(false) }
  }
  return <section className="glass mb-5 rounded-2xl p-4">
    <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-deep-800">الجداول الأسبوعية</h2><button className="water-btn-outline min-h-11 rounded-xl px-3 text-sm" onClick={() => setCreating(true)}>+ جدول أسبوعي</button></div>
    {!rows.length && !error && <p className="mt-2 text-sm text-deep-500">اختر أيامك مرة واحدة، وستُنشأ الحلقات تلقائياً كل أسبوع.</p>}
    {rows.map(row => <article key={row.id} className="mt-3 rounded-xl border border-water-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-deep-800">{row.name || 'حلقة أسبوعية'} · {row.is_active ? 'مفعّل' : 'متوقف'}</h3><p className="text-sm text-deep-500">{row.weekdays.map(d => WEEKDAYS[d]).join('، ')} · {row.timezone}</p></div><div className="flex gap-2"><button disabled={busy} className="water-btn-outline min-h-11 rounded-xl px-3 text-sm" onClick={() => setEditing(row)}>تعديل</button><button disabled={busy} className="water-btn-outline min-h-11 rounded-xl px-3 text-sm" onClick={() => void change(() => api.updateSessionSchedule(row.id, { ...schedulePayload(row), is_active: !row.is_active }))}>{row.is_active ? 'إيقاف مؤقت' : 'استئناف'}</button></div></div>
      {row.upcoming.map(item => <div key={item.date} className="mt-2 flex items-center justify-between gap-2 text-sm"><span>{item.session_id && item.status === 'created' ? <Link className="text-blue-700 dark:text-blue-300" href={`/sessions/${item.session_id}`}>{item.date}</Link> : item.date} · {item.status === 'skipped' ? 'تم التخطي' : item.status === 'conflict' ? 'توجد حلقة مسبقاً' : 'مجدولة'}</span>{item.status === 'created' && <button disabled={busy} className="min-h-11 px-3 text-deep-600" onClick={() => { if (window.confirm(`تخطي حلقة ${item.date} فقط؟ سيستمر الجدول الأسبوعي.`)) void change(() => api.skipSessionOccurrence(row.id, item.date, row.version)) }}>تخطي هذه الحلقة</button>}</div>)}
    </article>)}
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    {(creating || editing) && <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-label="جدول أسبوعي" className="mobile-sheet glass-strong max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{editing ? 'تعديل الجدول' : 'جدول أسبوعي جديد'}</h2><button className="min-h-11 px-3" onClick={() => { setCreating(false); setEditing(null) }}>إغلاق</button></div><ScheduleForm key={editing?.id || 'new'} schedule={editing || undefined} onSaved={() => { setCreating(false); setEditing(null); void load(); onChanged() }} /></div></div>}
  </section>
}

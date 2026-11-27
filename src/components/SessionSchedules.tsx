'use client'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { WEEKDAYS, browserTimezone, localToday, schedulePayload, weekdaysLabel } from '@/lib/session-schedules'
import type { SessionSchedule } from '@/lib/session-schedules'
import type { StudentCategory, StudentInfo } from '@/lib/types'

export function ScheduleForm({ schedule, onSaved }: { schedule?: SessionSchedule; onSaved: () => void }) {
  const [weekdays, setWeekdays] = useState<number[]>(schedule?.weekdays || [])
  const [name, setName] = useState(schedule?.name || '')
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

  const toggleDay = (day: number) => setWeekdays(v => v.includes(day) ? v.filter(d => d !== day) : [...v, day].sort())
  const toggleMember = (id: number) => setIds(v => v.includes(id) ? v.filter(n => n !== id) : [...v, id])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const input = {
        name: name.trim() || null,
        weekdays,
        // Dates and timezone are not asked for: a schedule starts today and runs until deleted.
        start_date: schedule?.start_date || localToday(),
        end_date: schedule?.end_date || null,
        timezone: schedule?.timezone || browserTimezone(),
        membership_mode: multiple ? mode : 'all' as const,
        member_ids: multiple && mode !== 'all' ? ids : [],
        is_active: schedule?.is_active ?? true,
      }
      if (schedule) await api.updateSessionSchedule(schedule.id, { ...input, expected_version: schedule.version })
      else await api.createSessionSchedule(input)
      onSaved()
    } catch (e: any) { setError(e.message || 'تعذر حفظ الجدول') } finally { setBusy(false) }
  }

  return <form className="space-y-4" onSubmit={submit}>
    <fieldset>
      <legend className="mb-2 text-sm font-bold">أيام الحلقة</legend>
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.map((day, index) => <button key={day} type="button" aria-pressed={weekdays.includes(index)} onClick={() => toggleDay(index)} className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${weekdays.includes(index) ? 'water-btn text-white' : 'water-btn-outline'}`}>{day}</button>)}
      </div>
    </fieldset>
    <label className="block text-sm">اسم الحلقة (اختياري)<input value={name} maxLength={100} onChange={e => setName(e.target.value)} className="surface-field mt-1 w-full rounded-xl p-3" /></label>
    {multiple && <>
      <label className="block text-sm">الطلاب<select value={mode} onChange={e => { setMode(e.target.value as typeof mode); setIds([]) }} className="surface-field mt-1 w-full rounded-xl p-3"><option value="all">كل الطلاب</option><option value="categories">حسب التصنيف</option><option value="students">طلاب محددون</option></select></label>
      {mode !== 'all' && <div className="max-h-48 overflow-y-auto rounded-xl border border-water-200 p-3">{(mode === 'categories' ? categories : students).map(v => <label key={v.id} className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" checked={ids.includes(v.id)} onChange={() => toggleMember(v.id)} />{v.name}</label>)}</div>}
    </>}
    <p className="text-sm text-deep-500">تُنشأ الحلقة تلقائياً الساعة 12 منتصف الليل في كل يوم مختار.</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <button disabled={!ready || busy || !weekdays.length || (multiple && mode !== 'all' && !ids.length)} className="water-btn min-h-11 w-full rounded-xl p-3 text-white disabled:opacity-50">{busy ? 'جاري الحفظ...' : 'حفظ'}</button>
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
  const close = () => { setCreating(false); setEditing(null) }

  return <section className="glass mb-5 rounded-2xl p-4">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-bold text-deep-800">الحلقات المتكررة</h2>
      <button className="water-btn-outline min-h-11 rounded-xl px-3 text-sm" onClick={() => setCreating(true)}>+ إضافة</button>
    </div>
    {!rows.length && !error && <p className="mt-2 text-sm text-deep-500">اختر الأيام مرة واحدة، وتُنشأ الحلقة تلقائياً في كل يوم منها.</p>}
    {rows.map(row => <div key={row.id} className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-water-200 p-3 ${row.is_active ? '' : 'opacity-60'}`}>
      <div className="min-w-0">
        <p className="font-semibold text-deep-800">{row.name || 'حلقة متكررة'}</p>
        <p className="text-sm text-deep-500">{weekdaysLabel(row.weekdays)}</p>
      </div>
      <div className="flex items-center gap-1">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-sm text-deep-600">
          <input type="checkbox" role="switch" checked={row.is_active} disabled={busy} onChange={() => void change(() => api.updateSessionSchedule(row.id, { ...schedulePayload(row), is_active: !row.is_active }))} />
          {row.is_active ? 'مفعّلة' : 'متوقفة'}
        </label>
        <button disabled={busy} className="min-h-11 px-3 text-sm text-blue-700 dark:text-blue-300" onClick={() => setEditing(row)}>تعديل</button>
        <button disabled={busy} className="min-h-11 px-3 text-sm text-red-500" onClick={() => { if (window.confirm('حذف هذه الحلقة المتكررة؟ الحلقات التي أُنشئت سابقاً ستبقى.')) void change(() => api.deleteSessionSchedule(row.id)) }}>حذف</button>
      </div>
    </div>)}
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    {(creating || editing) && <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label="حلقة متكررة" className="mobile-sheet glass-strong max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{editing ? 'تعديل الحلقة المتكررة' : 'حلقة متكررة جديدة'}</h2><button className="min-h-11 px-3" onClick={close}>إغلاق</button></div>
        <ScheduleForm key={editing?.id || 'new'} schedule={editing || undefined} onSaved={() => { close(); void load(); onChanged() }} />
      </div>
    </div>}
  </section>
}

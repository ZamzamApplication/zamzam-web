'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { matchesTripSearch } from '@/lib/trips'
import { TripDialog, tripField } from '@/components/trips/TripForms'
import { addDays, arabicNumber, localToday, type Competition, type CompetitionInput, type CompetitionStudent } from '@/lib/competitions'
import type { SheikhInfo, StudentCategory } from '@/lib/types'

const primary = 'water-btn min-h-11 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50'

function FormError({ error }: { error: string }) {
  return error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p> : null
}

export function CompetitionFormDialog({ competition, onClose, onSaved }: { competition?: Competition; onClose: () => void; onSaved: (competition: Competition) => void }) {
  const today = localToday()
  const [values, setValues] = useState<CompetitionInput>(() => competition
    ? { title: competition.title, description: competition.description, start_date: competition.start_date, end_date: competition.end_date, points_per_check: competition.points_per_check, completion_threshold: competition.completion_threshold, name_display: competition.name_display, public_limit: competition.public_limit }
    : { title: '', description: '', start_date: today, end_date: addDays(today, 29), points_per_check: 1, completion_threshold: null, name_display: 'short', public_limit: 10 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof CompetitionInput>(key: K, value: CompetitionInput[K]) => setValues(current => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (values.end_date < values.start_date) { setError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية.'); return }
    setBusy(true); setError('')
    try {
      onSaved(competition ? await api.updateCompetition(competition.id, { ...values, expected_version: competition.version }) : await api.createCompetition(values))
    } catch (err: any) { setError(err.message || 'تعذر حفظ المسابقة') } finally { setBusy(false) }
  }
  return <TripDialog title={competition ? 'إعدادات المسابقة' : 'مسابقة جديدة'} subtitle={competition ? undefined : 'حدّد الفترة وطريقة الاحتساب. ستضيف المشاركين بعد الإنشاء.'} onClose={onClose} busy={busy}>
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">اسم المسابقة<input autoFocus required maxLength={120} placeholder="مثلاً: تحدي صلاة الفجر" value={values.title} onChange={e => set('title', e.target.value)} className={tripField} /></label>
      <label className="block text-sm font-semibold">وصف يظهر للجميع (اختياري)<textarea maxLength={2000} rows={2} placeholder="مثلاً: يُحتسب يوم لكل طالب يصلي الفجر في المسجد" value={values.description} onChange={e => set('description', e.target.value)} className={tripField} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold">من<input required type="date" value={values.start_date} onChange={e => set('start_date', e.target.value)} className={tripField} /></label>
        <label className="text-sm font-semibold">إلى<input required type="date" min={values.start_date} value={values.end_date} onChange={e => set('end_date', e.target.value)} className={tripField} /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold">نقاط كل يوم<input required type="number" min={1} max={100} value={values.points_per_check} onChange={e => set('points_per_check', Number(e.target.value) || 1)} className={tripField} /></label>
        <label className="text-sm font-semibold">نقاط وسام الإتمام<input type="number" min={1} placeholder="اختياري" value={values.completion_threshold ?? ''} onChange={e => set('completion_threshold', e.target.value ? Number(e.target.value) : null)} className={tripField} /><span className="mt-1 block text-xs font-normal text-deep-500">كل من يصل لها يحصل على ⭐ بغض النظر عن ترتيبه.</span></label>
      </div>
      <fieldset className="rounded-2xl border border-water-200 p-4">
        <legend className="px-1 text-sm font-bold">لوحة المتصدرين العامة</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">طريقة عرض الأسماء<select value={values.name_display} onChange={e => set('name_display', e.target.value as CompetitionInput['name_display'])} className={tripField}><option value="short">الاسم الأول + أول حرف (أحمد م.)</option><option value="full">الاسم كاملاً</option></select></label>
          <label className="text-sm font-semibold">عدد المراكز المعروضة<select value={values.public_limit} onChange={e => set('public_limit', Number(e.target.value))} className={tripField}>{[3, 5, 10, 20, 50].map(n => <option key={n} value={n}>أول {n}</option>)}<option value={0}>كل من لديه نقاط</option></select></label>
        </div>
        <p className="mt-2 text-xs leading-5 text-deep-500">لا تظهر الصور أو أرقام الهواتف أبداً، ولا يظهر من ليس لديه نقاط.</p>
      </fieldset>
      <FormError error={error} />
      <button disabled={busy} className={`${primary} w-full`}>{busy ? 'جاري الحفظ…' : competition ? 'حفظ التعديلات' : 'إنشاء المسابقة ←'}</button>
    </form>
  </TripDialog>
}

type AddMode = 'sheikhs' | 'categories' | 'students'

export function AddCompetitorsDialog({ competitionId, existingStudentIds, onClose, onSaved }: { competitionId: number; existingStudentIds: Set<number>; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [mode, setMode] = useState<AddMode>('sheikhs')
  const [students, setStudents] = useState<CompetitionStudent[]>([])
  const [sheikhs, setSheikhs] = useState<SheikhInfo[]>([])
  const [categories, setCategories] = useState<StudentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Record<AddMode, Set<number>>>({ sheikhs: new Set(), categories: new Set(), students: new Set() })
  useEffect(() => {
    Promise.all([api.getCompetitionStudents(), api.getSheikhs(), api.getStudentCategories()])
      .then(([s, sh, c]) => { setStudents(s); setSheikhs(sh); setCategories(c) })
      .catch(e => setError(e.message || 'تعذر التحميل'))
      .finally(() => setLoading(false))
  }, [])
  const toggle = (id: number) => setPicked(current => { const next = new Set(current[mode]); next.has(id) ? next.delete(id) : next.add(id); return { ...current, [mode]: next } })
  // Preview exactly which new students the selection resolves to, so the admin sees the outcome before saving.
  const resolved = useMemo(() => {
    const ids = new Set<number>(picked.students)
    for (const student of students) {
      if (student.sheikh_id !== null && picked.sheikhs.has(student.sheikh_id)) ids.add(student.id)
      if (student.category_ids.some(id => picked.categories.has(id))) ids.add(student.id)
    }
    return [...ids].filter(id => !existingStudentIds.has(id))
  }, [picked, students, existingStudentIds])
  const countBy = (match: (s: CompetitionStudent) => boolean) => students.filter(s => match(s) && !existingStudentIds.has(s.id)).length
  const searchResults = students.filter(s => !existingStudentIds.has(s.id) && matchesTripSearch({ name: s.name, phone: '', student_code: '', sheikh_name: s.sheikh_name }, query))
  const save = async () => {
    setBusy(true); setError('')
    try {
      const result = await api.addCompetitionParticipants(competitionId, { student_ids: [...picked.students], sheikh_ids: [...picked.sheikhs], category_ids: [...picked.categories] })
      await onSaved(`تمت إضافة ${arabicNumber(result.added)} متسابق`)
      onClose()
    } catch (err: any) { setError(err.message || 'تعذر إضافة المشاركين') } finally { setBusy(false) }
  }
  const tabs: { key: AddMode; label: string }[] = [{ key: 'sheikhs', label: 'حسب الحلقة' }, { key: 'categories', label: 'حسب التصنيف' }, { key: 'students', label: 'طلاب بالاسم' }]
  const row = (id: number, title: string, detail: string) => <label key={id} className={`flex min-h-14 cursor-pointer items-center gap-3 border-b border-water-200/40 px-3 py-2.5 last:border-0 ${picked[mode].has(id) ? 'bg-amber-50 dark:bg-amber-950/30' : 'hover:bg-water-50 dark:hover:bg-slate-800'}`}><input type="checkbox" checked={picked[mode].has(id)} onChange={() => toggle(id)} className="h-5 w-5 accent-amber-500" /><span className="min-w-0"><span className="block text-sm font-bold">{title}</span><span className="mt-0.5 block text-xs text-deep-500">{detail}</span></span></label>
  return <TripDialog title="إضافة المتسابقين" subtitle="أضف حلقة كاملة أو تصنيفاً بضغطة واحدة، أو اختر طلاباً بعينهم." onClose={onClose} busy={busy}>
    <div className="mb-4 flex rounded-xl bg-water-100/60 p-1 dark:bg-slate-900" role="tablist">{tabs.map(tab => <button key={tab.key} type="button" role="tab" aria-selected={mode === tab.key} onClick={() => setMode(tab.key)} className={`min-h-11 flex-1 rounded-lg text-xs font-bold sm:text-sm ${mode === tab.key ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-deep-500'}`}>{tab.label}{picked[tab.key].size > 0 && ` (${picked[tab.key].size})`}</button>)}</div>
    {mode === 'students' && <input autoFocus aria-label="ابحث عن طالب" placeholder="ابحث بالاسم أو اسم الشيخ…" value={query} onChange={e => setQuery(e.target.value)} className={`${tripField} mb-3`} />}
    <div className="max-h-72 overflow-y-auto rounded-xl border border-water-200">
      {loading ? <p className="p-6 text-center text-sm text-deep-500">جاري التحميل…</p>
        : mode === 'sheikhs' ? (sheikhs.length ? sheikhs.map(s => row(s.id, s.name, `${arabicNumber(countBy(st => st.sheikh_id === s.id))} طالب غير مضاف`)) : <p className="p-6 text-center text-sm text-deep-500">لا توجد حلقات.</p>)
        : mode === 'categories' ? (categories.length ? categories.map(c => row(c.id, c.name, `${arabicNumber(countBy(st => st.category_ids.includes(c.id)))} طالب غير مضاف`)) : <p className="p-6 text-center text-sm text-deep-500">لا توجد تصنيفات بعد.</p>)
        : (searchResults.length ? searchResults.slice(0, 300).map(s => row(s.id, s.name, s.sheikh_name || 'بدون شيخ')) : <p className="p-6 text-center text-sm text-deep-500">لا يوجد طلاب متاحون.</p>)}
    </div>
    <FormError error={error} />
    <div className="mt-5 flex items-center justify-between gap-3"><span className="text-sm text-deep-500">{arabicNumber(resolved.length)} طالب جديد سيُضاف</span><button disabled={busy || resolved.length === 0} onClick={save} className={primary}>{busy ? 'جاري الإضافة…' : 'إضافة'}</button></div>
  </TripDialog>
}

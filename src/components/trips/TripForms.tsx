'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { matchesTripSearch, parseTripMoney, tripMoney, type TripInput, type TripParticipant, type TripStudent, type TripGroup } from '@/lib/trips'

export const tripField = 'surface-field mt-1.5 min-h-11 w-full rounded-xl px-3 py-2.5 text-sm'
const primary = 'water-btn min-h-11 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50'

export function TripDialog({ title, subtitle, children, onClose, busy = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} dir="rtl" aria-labelledby="trip-dialog-title" onCancel={event => { if (busy) event.preventDefault() }} onClose={onClose} onClick={event => { if (!busy && event.target === event.currentTarget) onClose() }} className="glass-card m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl p-5 text-deep-800 shadow-2xl backdrop:bg-slate-950/65 backdrop:backdrop-blur-sm sm:p-7">
    <div className="mb-5 flex items-start justify-between gap-3"><div><h2 id="trip-dialog-title" className="text-xl font-bold">{title}</h2>{subtitle && <p className="mt-2 text-sm leading-6 text-deep-500">{subtitle}</p>}</div><button type="button" disabled={busy} onClick={onClose} aria-label="إغلاق" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-water-200 text-xl">×</button></div>
    {children}
  </dialog>
}

function FormError({ error }: { error: string }) {
  return error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p> : null
}

export function CreateTripDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fee, setFee] = useState('0')
  const [values, setValues] = useState<Omit<TripInput, 'fee_minor'>>({ name: '', date: '', destination: '', meeting_point: '', departure_time: '', currency: 'EGP', notes: '' })
  const field = (key: keyof typeof values, value: string) => setValues(current => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const amount = parseTripMoney(fee)
    if (amount === null) { setError('أدخل رسوماً صحيحة بحد أقصى منزلتين عشريتين.'); return }
    setBusy(true); setError('')
    try { const trip = await api.createTrip({ ...values, fee_minor: amount }); onCreated(trip.id) }
    catch (err: any) { setError(err.message || 'تعذر إنشاء الرحلة') }
    finally { setBusy(false) }
  }
  return <TripDialog title="نخطط لرحلة جديدة" subtitle="ابدأ بالتفاصيل، ثم أضف المشاركين وجهّز قائمة الانطلاق." onClose={onClose} busy={busy}>
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">اسم الرحلة<input autoFocus required maxLength={120} placeholder="مثلاً: رحلة القرية الأولمبية" value={values.name} onChange={e => field('name', e.target.value)} className={tripField} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">موعد الرحلة<input required type="date" value={values.date} onChange={e => field('date', e.target.value)} className={tripField} /></label><label className="text-sm font-semibold">وقت التجمع<input type="time" value={values.departure_time} onChange={e => field('departure_time', e.target.value)} className={tripField} /></label></div>
      <label className="block text-sm font-semibold">الوجهة<input maxLength={200} placeholder="إلى أين نتجه؟" value={values.destination} onChange={e => field('destination', e.target.value)} className={tripField} /></label>
      <label className="block text-sm font-semibold">مكان التجمع<input maxLength={200} placeholder="مثلاً: أمام الدار" value={values.meeting_point} onChange={e => field('meeting_point', e.target.value)} className={tripField} /></label>
      <div className="grid grid-cols-[1fr_110px] gap-3"><label className="text-sm font-semibold">رسوم الفرد<input required inputMode="decimal" value={fee} onChange={e => setFee(e.target.value)} className={tripField} /><span className="mt-1 block text-xs font-normal text-deep-500">اكتب 0 إذا كانت الرحلة مجانية.</span></label><label className="text-sm font-semibold">العملة<select value={values.currency} onChange={e => field('currency', e.target.value)} className={tripField}><option value="EGP">جنيه مصري</option><option value="SAR">ريال سعودي</option><option value="USD">دولار</option></select></label></div>
      <label className="block text-sm font-semibold">ملاحظات الرحلة<textarea maxLength={4000} placeholder="تعليمات التجمع أو الأشياء المطلوبة…" value={values.notes} onChange={e => field('notes', e.target.value)} className={tripField} /></label>
      <FormError error={error} /><button disabled={busy} className={`${primary} w-full`}>{busy ? 'جاري الإنشاء…' : 'إنشاء الرحلة ←'}</button>
    </form>
  </TripDialog>
}

export function AddTripPeopleDialog({ tripId, registeredStudentIds, groups, adults, defaultGroup, onClose, onSaved }: { tripId: number; registeredStudentIds: Set<number>; groups: TripGroup[]; adults: TripParticipant[]; defaultGroup: number | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [students, setStudents] = useState<TripStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'students' | 'guests'>('students')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [guests, setGuests] = useState<{ name: string; phone: string; is_adult: boolean }[]>([])
  const [guestAdult, setGuestAdult] = useState(true)
  const [groupId, setGroupId] = useState<number | null>(defaultGroup)
  const [guardianId, setGuardianId] = useState<number | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const load = () => { setLoading(true); setError(''); api.getTripStudents().then(setStudents).catch(e => setError(e.message)).finally(() => setLoading(false)) }
  useEffect(load, [])
  const available = students.filter(student => !registeredStudentIds.has(student.id))
  const results = available.filter(student => matchesTripSearch(student, query))
  const toggle = (id: number) => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const addGuest = () => {
    if (!guestName.trim()) return
    setGuests(current => [...current, { name: guestName.trim(), phone: guestPhone.trim(), is_adult: guestAdult }]); setGuestName(''); setGuestPhone('')
  }
  const save = async () => {
    const pendingGuests = guestName.trim() ? [...guests, { name: guestName.trim(), phone: guestPhone.trim(), is_adult: guestAdult }] : guests
    setBusy(true); setError('')
    try { await api.addTripParticipants(tripId, [...selected], pendingGuests, groupId, guardianId); await onSaved(); onClose() }
    catch (err: any) { setError(err.message || 'تعذر إضافة المشاركين') }
    finally { setBusy(false) }
  }
  const count = selected.size + guests.length + (guestName.trim() ? 1 : 0)
  return <TripDialog title="من سيشارك معنا؟" subtitle="اختر الطلاب أو أضف ضيوفاً بالاسم. يمكن البحث باسم الشيخ أو رقم الهاتف أيضاً." onClose={onClose} busy={busy}>
    <div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">المجموعة / وسيلة الانتقال<select value={groupId ?? ''} onChange={e => setGroupId(e.target.value ? Number(e.target.value) : null)} className={tripField}><option value="">بدون مجموعة</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label className="text-xs font-bold">مرافق الطلاب والضيوف الصغار<select value={guardianId ?? ''} onChange={e => setGuardianId(e.target.value ? Number(e.target.value) : null)} className={tripField}><option value="">مستقل / بدون مرافق</option>{adults.map(adult => <option key={adult.id} value={adult.id}>{adult.name}</option>)}</select></label></div>
    <div className="mb-4 flex rounded-xl bg-water-100/60 p-1 dark:bg-slate-900"><button type="button" onClick={() => setMode('students')} className={`min-h-11 flex-1 rounded-lg text-sm font-bold ${mode === 'students' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-deep-500'}`}>الطلاب {selected.size > 0 && `(${selected.size})`}</button><button type="button" onClick={() => setMode('guests')} className={`min-h-11 flex-1 rounded-lg text-sm font-bold ${mode === 'guests' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-deep-500'}`}>الضيوف {guests.length > 0 && `(${guests.length})`}</button></div>
    {mode === 'students' ? <>
      <input autoFocus aria-label="البحث عن طالب لإضافته" placeholder="ابحث بالاسم، الرقم، الهاتف أو الشيخ…" value={query} onChange={e => setQuery(e.target.value)} className={tripField} />
      <div className="my-3 flex items-center justify-between gap-2 text-xs text-deep-500"><span>{results.length} طالب متاح</span><button type="button" onClick={() => setSelected(current => new Set([...current, ...results.map(student => student.id)]))} disabled={loading} className="min-h-9 font-bold text-blue-700 dark:text-blue-300">تحديد نتائج البحث</button></div>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-water-200">
        {loading ? <p className="p-6 text-center text-sm text-deep-500">جاري تحميل الطلاب…</p> : results.length === 0 ? <p className="p-6 text-center text-sm text-deep-500">لا يوجد طلاب متاحون بهذه البيانات.</p> : results.map(student => <label key={student.id} className={`flex min-h-16 cursor-pointer items-center gap-3 border-b border-water-200/40 px-3 py-3 last:border-0 ${selected.has(student.id) ? 'bg-cyan-50 dark:bg-cyan-950/40' : 'hover:bg-water-50 dark:hover:bg-slate-800'}`}><input type="checkbox" checked={selected.has(student.id)} onChange={() => toggle(student.id)} className="h-5 w-5 accent-cyan-600" /><span className="min-w-0"><span className="block text-sm font-bold">{student.name}</span><span className="mt-1 block text-xs text-deep-500">{[student.student_code && `#${student.student_code}`, student.sheikh_name, student.phone].filter(Boolean).join(' · ')}</span></span></label>)}
      </div>
      {!loading && error && <button onClick={load} className="mt-2 text-sm text-blue-700">إعادة تحميل الطلاب</button>}
    </> : <div className="space-y-3"><label className="block text-sm font-semibold">اسم الضيف<input autoFocus maxLength={120} value={guestName} onChange={e => setGuestName(e.target.value)} className={tripField} placeholder="الاسم بالكامل" /></label><label className="block text-sm font-semibold">رقم الهاتف (اختياري)<input type="tel" maxLength={30} value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className={tripField} placeholder="رقم التواصل" /></label><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={guestAdult} onChange={e => setGuestAdult(e.target.checked)} className="h-5 w-5 accent-cyan-600" />ضيف بالغ يمكن ربط طلاب به</label><button type="button" disabled={!guestName.trim() || guests.length >= 99} onClick={addGuest} className="water-btn-outline min-h-11 w-full rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40">＋ إضافة ضيف آخر</button>{guests.map((guest, index) => <div key={index} className="flex items-center justify-between rounded-xl bg-water-50 p-3 dark:bg-slate-900"><span className="text-sm">{guest.name}</span><button type="button" aria-label={`إزالة ${guest.name} من الاختيار`} onClick={() => setGuests(current => current.filter((_, i) => i !== index))} className="h-9 w-9 text-red-500">×</button></div>)}</div>}
    <FormError error={error} /><div className="mt-5 flex items-center justify-between gap-3"><span className="text-sm text-deep-500">{count} مشارك محدد</span><button disabled={busy || count === 0} onClick={save} className={primary}>{busy ? 'جاري الإضافة…' : 'إضافة المشاركين'}</button></div>
  </TripDialog>
}

export function ParticipantTripDialog({ person, currency, groups, adults, onClose, onSave }: { person: TripParticipant; currency: string; groups: TripGroup[]; adults: TripParticipant[]; onClose: () => void; onSave: (body: { fee_minor: number; paid_minor: number; notes: string; active: boolean; payment_exempt: boolean; exemption_reason: string; group_id: number | null; guardian_id: number | null; is_adult: boolean }) => Promise<void> }) {
  const [fee, setFee] = useState(String(person.fee_minor / 100))
  const [paid, setPaid] = useState(String(person.paid_minor / 100))
  const [notes, setNotes] = useState(person.notes)
  const [active, setActive] = useState(person.active)
  const [groupId, setGroupId] = useState(person.group_id)
  const [guardianId, setGuardianId] = useState(person.guardian_id)
  const [isAdult, setIsAdult] = useState(person.is_adult)
  const [exempt, setExempt] = useState(person.payment_exempt)
  const [reason, setReason] = useState(person.exemption_reason)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const amount = parseTripMoney(fee), payment = parseTripMoney(paid)
    if (amount === null || payment === null || payment > amount) { setError('أدخل مبالغ صحيحة. يجب ألا يزيد المدفوع عن الرسوم.'); return }
    setBusy(true); setError('')
    try { await onSave({ fee_minor: amount, paid_minor: payment, notes, active, payment_exempt: exempt, exemption_reason: reason, group_id: groupId, guardian_id: guardianId, is_adult: isAdult }); onClose() }
    catch (err: any) { setError(err.message || 'تعذر الحفظ') }
    finally { setBusy(false) }
  }
  return <TripDialog title={person.name} subtitle="عدّل الرسوم، وسجّل دفعة جزئية أو ملاحظة للمشارك." onClose={onClose} busy={busy}><form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-semibold">المجموعة / وسيلة الانتقال<select value={groupId ?? ''} onChange={e => setGroupId(e.target.value ? Number(e.target.value) : null)} className={tripField}><option value="">بدون مجموعة</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
    <label className="flex min-h-11 items-center gap-3 text-sm font-bold"><input type="checkbox" checked={isAdult} onChange={e => { setIsAdult(e.target.checked); if (e.target.checked) setGuardianId(null) }} className="h-5 w-5 accent-cyan-600" />بالغ مسؤول يمكن ربط الطلاب به</label>
    {!isAdult && <label className="block text-sm font-semibold">المرافق المسؤول<select value={guardianId ?? ''} onChange={e => setGuardianId(e.target.value ? Number(e.target.value) : null)} className={tripField}><option value="">مستقل / بدون مرافق</option>{adults.filter(adult => adult.id !== person.id).map(adult => <option key={adult.id} value={adult.id}>{adult.name}</option>)}</select></label>}
    <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">رسوم المشاركة<input autoFocus required inputMode="decimal" value={fee} onChange={e => setFee(e.target.value)} className={tripField} /></label><label className="text-sm font-semibold">إجمالي المدفوع<input required inputMode="decimal" value={paid} onChange={e => setPaid(e.target.value)} className={tripField} /></label></div><p className="text-xs text-deep-500">المبلغ المطلوب حالياً: {tripMoney(person.fee_minor, currency)}</p>
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-800 dark:bg-violet-950/30"><input type="checkbox" checked={exempt} onChange={e => setExempt(e.target.checked)} className="h-5 w-5 accent-violet-600" /><span className="text-sm font-bold">إعفاء من رسوم الرحلة</span></label>
    {exempt && <label className="block text-sm font-semibold">سبب الإعفاء (اختياري)<input maxLength={200} value={reason} onChange={e => setReason(e.target.value)} className={tripField} placeholder="سبب أو ملاحظة للإدارة" /><span className="mt-1 block text-xs font-normal text-deep-500">لن يُحسب ضمن غير المسددين. يُحتفظ بأي مبلغ سبق تحصيله حتى تسجل استرداده.</span></label>}
    <label className="block text-sm font-semibold">ملاحظات<textarea maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} className={tripField} placeholder="مثلاً: سيأتي مع ولي أمره…" /></label>
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-water-200 p-3"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-5 w-5 accent-cyan-600" /><span className="text-sm font-bold">مشارك في الرحلة</span></label>
    {!active && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">سيُستبعد من التحقق الحالي والجولات القادمة، مع الاحتفاظ بالجولات السابقة والمدفوعات. إذا استرد مبلغاً، عدّل إجمالي المدفوع أيضاً.</p>}
    <FormError error={error} /><button disabled={busy} className={`${primary} w-full`}>{busy ? 'جاري الحفظ…' : 'حفظ التغييرات'}</button>
  </form></TripDialog>
}

export function NewTripRoundDialog({ first, onClose, onStart }: { first: boolean; onClose: () => void; onStart: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState(first ? 'تجمع الصباح' : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await onStart(title.trim()); onClose() } catch (err: any) { setError(err.message || 'تعذر بدء التحقق') } finally { setBusy(false) }
  }
  return <TripDialog title={first ? 'حان وقت التجمع' : 'نتأكد أن الجميع معنا'} subtitle="تبدأ كل جولة بقائمة غير محددة. تُحفظ الجولة السابقة للرجوع إليها، ولن تنتقل علامات الحضور منها." onClose={onClose} busy={busy}><form onSubmit={submit}><label className="block text-sm font-semibold">اسم جولة التحقق<input autoFocus required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className={tripField} placeholder="مثلاً: قبل ركوب الحافلة" /></label><div className="mt-3 flex flex-wrap gap-2">{['تجمع الصباح', 'قبل الانطلاق', 'بعد الوصول', 'قبل العودة'].map(label => <button key={label} type="button" onClick={() => setTitle(label)} className="rounded-full border border-water-200 px-3 py-2 text-xs text-deep-600">{label}</button>)}</div><FormError error={error} /><button disabled={busy} className={`${primary} mt-5 w-full`}>{busy ? 'جاري البدء…' : 'بدء جولة تحقق جديدة'}</button></form></TripDialog>
}


export function AddTripGroupDialog({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <TripDialog title="مجموعة جديدة" subtitle="قسّم الرحلة إلى أتوبيسات أو سيارات أو مجموعات ليسهل الاطمئنان على كل مجموعة." onClose={onClose} busy={busy}><form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await onSave(name.trim()); onClose() } catch (err: any) { setError(err.message || 'تعذر إضافة المجموعة') } finally { setBusy(false) } }}><label className="text-sm font-bold">اسم المجموعة<input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً: أتوبيس ١ أو سيارة الأستاذ أحمد" className={tripField} /></label><FormError error={error} /><button disabled={busy} className={`${primary} mt-5 w-full`}>{busy ? 'جاري الحفظ…' : 'إضافة المجموعة'}</button></form></TripDialog>
}

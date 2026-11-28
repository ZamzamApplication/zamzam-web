'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/format'
import { compressProfileImage } from '@/lib/image'
import { confirmAction, toast } from '@/lib/ui-feedback'
import { STUDENT_STATUSES } from '@/lib/student-status'
import type { ExcusedPeriodInfo, ExcusedWeekdayInfo, StudentCategory, StudentInfo, WarningInfo } from '@/lib/types'
import { ErrorMsg, Modal } from '@/components/ManagementModal'
import StudentCustomFieldsEditor from '@/components/StudentCustomFieldsEditor'
import Icon from '@/components/Icon'

export const WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function normalizeExcusedWeekdays(days: (ExcusedWeekdayInfo | number)[] | undefined): ExcusedWeekdayInfo[] {
  return (days || []).map((day) => (
    typeof day === 'number' ? { weekday: day, note: '' } : { ...day, note: day.note || '' }
  ))
}

export function excusedPeriodStatusLabel(status: ExcusedPeriodInfo['status']): string {
  return { upcoming: 'قادمة', active: 'نشطة', completed: 'منتهية', cancelled: 'ملغاة' }[status]
}

const PARENT_TYPES = ['أب', 'أم', 'أخ', 'أخت', 'جد', 'جدة', 'أرضي']

export function StudentCategoryPicker({ selected, onChange }: { selected: number[]; onChange(ids: number[]): void }) {
  const [categories, setCategories] = useState<StudentCategory[]>([])

  useEffect(() => {
    api.getStudentCategories().then(setCategories).catch(() => {})
  }, [])

  if (categories.length === 0) return null
  return <div>
    <span className="mb-2 block text-sm font-semibold text-deep-700">تصنيفات الطالب</span>
    <div className="flex flex-wrap gap-2">
      {categories.map(category => {
        const checked = selected.includes(category.id)
        return <label key={category.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${checked ? 'border-cyan-500 bg-cyan-100 text-blue-800 dark:bg-cyan-900/40 dark:text-blue-200' : 'border-water-200 text-deep-600'}`}>
          <input type="checkbox" checked={checked} onChange={() => onChange(checked ? selected.filter(id => id !== category.id) : [...selected, category.id])} className="rounded" />
          {category.name}
        </label>
      })}
    </div>
  </div>
}

export type EditStudentTab = 'basic' | 'parents' | 'excuses' | 'warnings' | 'custom'

const TABS: { key: EditStudentTab; label: string }[] = [
  { key: 'basic', label: 'البيانات الأساسية' },
  { key: 'parents', label: 'أولياء الأمور' },
  { key: 'excuses', label: 'الأعذار' },
  { key: 'warnings', label: 'الإنذارات' },
  { key: 'custom', label: 'حقول مخصصة' },
]

const FIELD = 'surface-field w-full rounded-xl px-4 py-2.5 text-sm'
const LABEL = 'block text-sm font-semibold text-deep-700'

/** Badge for parts of the form that save on their own, without the main save button. */
function SavesImmediately() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-200"><Icon name="check" className="h-3.5 w-3.5" />يُحفظ فوراً</span>
}

export default function EditStudentModal({ student, onClose, onUpdated, initialTab = 'basic' }: {
  student: StudentInfo
  sheikhName?: string
  onClose: () => void
  onUpdated: () => void
  initialTab?: EditStudentTab
}) {
  const initialPic = student.profile_pic || ''
  const [tab, setTab] = useState<EditStudentTab>(initialTab)
  const [name, setName] = useState(student.name)
  const [phone, setPhone] = useState(student.phone || '')
  const [studentId, setStudentId] = useState(student.student_id || '')
  const [birthday, setBirthday] = useState(student.birthday || '')
  const [registrationDate, setRegistrationDate] = useState(student.registration_date || '')
  const [profilePic, setProfilePic] = useState(initialPic)
  const [status, setStatus] = useState(student.status)
  const [warnings, setWarnings] = useState<WarningInfo[]>(student.warnings)
  const [newWarningReason, setNewWarningReason] = useState('')
  const [addingWarning, setAddingWarning] = useState(false)
  const [deletingWarningId, setDeletingWarningId] = useState<number | null>(null)
  const [editingWarningId, setEditingWarningId] = useState<number | null>(null)
  const [editingWarningText, setEditingWarningText] = useState('')
  const [savingWarningEdit, setSavingWarningEdit] = useState(false)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [parentPhones, setParentPhones] = useState<{ phone_number?: string; parent_type?: string; name?: string }[]>(
    student.parent_phones?.map((p) => ({ phone_number: p.phone_number, parent_type: p.parent_type, name: p.name || '' })) || []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [excusedWeekdays, setExcusedWeekdays] = useState<ExcusedWeekdayInfo[]>(normalizeExcusedWeekdays(student.excused_weekdays))
  const [excusedPeriods, setExcusedPeriods] = useState<ExcusedPeriodInfo[]>(student.excused_periods || [])
  const [periodForm, setPeriodForm] = useState({ start_date: '', end_date: '', reason: '' })
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null)
  const [endingPeriod, setEndingPeriod] = useState<{ id: number; date: string } | null>(null)
  const [periodBusy, setPeriodBusy] = useState(false)
  const [periodError, setPeriodError] = useState('')
  const [categoryIds, setCategoryIds] = useState<number[]>(student.category_ids || student.categories?.map(category => category.id) || [])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(student.custom_field_values || {})
  const [quranProgressEnabled, setQuranProgressEnabled] = useState(Boolean(student.quran_progress_enabled))
  // Anything that saves immediately (warnings, periods, photo upload) means the parent must reload on close.
  const changedOnServer = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  const snapshot = useMemo(() => JSON.stringify({
    name, phone, studentId, birthday, registrationDate, profilePic, status, parentPhones, excusedWeekdays, categoryIds, customFieldValues, quranProgressEnabled,
  }), [name, phone, studentId, birthday, registrationDate, profilePic, status, parentPhones, excusedWeekdays, categoryIds, customFieldValues, quranProgressEnabled])
  const [initialSnapshot, setInitialSnapshot] = useState(snapshot)
  const weekdaysLoaded = useRef(Boolean(student.excused_weekdays))
  const dirty = snapshot !== initialSnapshot

  useEffect(() => {
    if (student.excused_weekdays) return
    api.getExcusedWeekdays(student.id).then((data) => {
      const days = normalizeExcusedWeekdays(data)
      setExcusedWeekdays(days)
      // Loading the saved days is not an edit.
      if (!weekdaysLoaded.current) {
        weekdaysLoaded.current = true
        setInitialSnapshot(current => {
          const parsed = JSON.parse(current)
          return JSON.stringify({ ...parsed, excusedWeekdays: days })
        })
      }
    }).catch(() => {})
  }, [student.id, student.excused_weekdays])

  useEffect(() => {
    api.getExcusedPeriods(student.id)
      .then(setExcusedPeriods)
      .catch((err: any) => setPeriodError(err.message || 'تعذر تحميل فترات الغياب بعذر'))
  }, [student.id])

  const requestClose = async () => {
    if (dirty && !await confirmAction({ title: 'تغييرات غير محفوظة', message: 'لم تحفظ تعديلات الطالب. هل تريد الإغلاق دون حفظها؟', confirmLabel: 'الإغلاق دون حفظ' })) return
    if (changedOnServer.current) onUpdated()
    else onClose()
  }

  const resetPeriodForm = () => {
    setPeriodForm({ start_date: '', end_date: '', reason: '' })
    setEditingPeriodId(null)
    setPeriodError('')
  }

  const saveExcusedPeriod = async () => {
    if (!periodForm.start_date || !periodForm.end_date || !periodForm.reason.trim()) {
      setPeriodError('أدخل تاريخ البداية والنهاية وسبب العذر.')
      return
    }
    if (periodForm.start_date > periodForm.end_date) {
      setPeriodError('يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساوياً له.')
      return
    }
    setPeriodBusy(true)
    setPeriodError('')
    try {
      const body = { ...periodForm, reason: periodForm.reason.trim() }
      const saved = editingPeriodId
        ? await api.updateExcusedPeriod(student.id, editingPeriodId, body)
        : await api.createExcusedPeriod(student.id, body)
      setExcusedPeriods(current => editingPeriodId
        ? current.map(period => period.id === saved.id ? saved : period)
        : [saved, ...current])
      changedOnServer.current = true
      resetPeriodForm()
      toast(editingPeriodId ? 'تم تعديل فترة العذر' : 'تمت إضافة فترة العذر', { tone: 'success' })
    } catch (err: any) {
      setPeriodError(err.message || 'تعذر حفظ فترة الغياب بعذر')
    } finally {
      setPeriodBusy(false)
    }
  }

  const startEditingPeriod = (period: ExcusedPeriodInfo) => {
    setEditingPeriodId(period.id)
    setPeriodForm({ start_date: period.start_date, end_date: period.end_date, reason: period.reason })
    setPeriodError('')
  }

  const cancelExcusedPeriod = async (period: ExcusedPeriodInfo) => {
    if (!await confirmAction(`إلغاء فترة العذر: ${period.reason}؟`)) return
    setPeriodBusy(true)
    setPeriodError('')
    try {
      const updated = await api.cancelExcusedPeriod(student.id, period.id)
      setExcusedPeriods(current => current.map(item => item.id === updated.id ? updated : item))
      changedOnServer.current = true
      if (editingPeriodId === period.id) resetPeriodForm()
    } catch (err: any) {
      setPeriodError(err.message || 'تعذر إلغاء فترة العذر')
    } finally {
      setPeriodBusy(false)
    }
  }

  const endExcusedPeriodEarly = async () => {
    if (!endingPeriod?.date) return
    setPeriodBusy(true)
    setPeriodError('')
    try {
      const updated = await api.endExcusedPeriodEarly(student.id, endingPeriod.id, endingPeriod.date)
      setExcusedPeriods(current => current.map(item => item.id === updated.id ? updated : item))
      changedOnServer.current = true
      if (editingPeriodId === endingPeriod.id) resetPeriodForm()
      setEndingPeriod(null)
    } catch (err: any) {
      setPeriodError(err.message || 'تعذر تسجيل العودة المبكرة')
    } finally {
      setPeriodBusy(false)
    }
  }

  const toggleExcusedWeekday = (wd: number) => {
    setExcusedWeekdays((prev) =>
      prev.some((d) => d.weekday === wd)
        ? prev.filter((d) => d.weekday !== wd)
        : [...prev, { weekday: wd, note: '' }]
    )
  }

  const updateExcusedWeekdayNote = (wd: number, note: string) => {
    setExcusedWeekdays((prev) => prev.map((d) => d.weekday === wd ? { ...d, note } : d))
  }

  const updateParentPhone = (i: number, field: 'phone_number' | 'parent_type' | 'name', value: string) => {
    setParentPhones(current => current.map((item, index) => index === i ? { ...item, [field]: value } : item))
  }

  const handleAddWarning = async () => {
    if (!newWarningReason.trim()) return
    setAddingWarning(true)
    setError('')
    try {
      const result = await api.addWarning(student.id, newWarningReason)
      setWarnings([{ id: result.id, reason: result.reason, warning_number: result.warning_number, sent: result.sent, sent_at: result.sent_at, created_at: result.created_at }, ...warnings])
      setNewWarningReason('')
      changedOnServer.current = true
      toast(`تمت إضافة الإنذار رقم ${result.warning_number}`, { tone: 'success' })
    } catch (err: any) {
      setError(err.message || 'فشل إضافة الإنذار')
    } finally {
      setAddingWarning(false)
    }
  }

  const handleDeleteWarning = async (warning: WarningInfo) => {
    if (!await confirmAction({ title: 'حذف الإنذار', message: `حذف الإنذار «${warning.reason}» نهائياً؟`, confirmLabel: 'حذف الإنذار' })) return
    setDeletingWarningId(warning.id)
    setError('')
    try {
      await api.deleteWarning(warning.id)
      setWarnings(current => current.filter((w) => w.id !== warning.id))
      changedOnServer.current = true
    } catch (err: any) {
      setError(err.message || 'فشل حذف الإنذار')
    } finally {
      setDeletingWarningId(null)
    }
  }

  const handleSaveWarningEdit = async () => {
    if (!editingWarningId || !editingWarningText.trim()) return
    setSavingWarningEdit(true)
    setError('')
    try {
      const updated = await api.updateWarning(editingWarningId, editingWarningText)
      setWarnings(current => current.map((w) => w.id === editingWarningId ? { ...w, reason: updated.reason } : w))
      setEditingWarningId(null)
      setEditingWarningText('')
      changedOnServer.current = true
    } catch (err: any) {
      setError(err.message || 'فشل تعديل الإنذار')
    } finally {
      setSavingWarningEdit(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = formRef.current
    // Fields on hidden tabs can't show the browser's validation bubble, so jump to the tab first.
    if (form && !form.checkValidity()) {
      const invalid = form.querySelector<HTMLElement>(':invalid:not(fieldset)')
      const panel = invalid?.closest<HTMLElement>('[data-tab]')?.dataset.tab as EditStudentTab | undefined
      if (panel) setTab(panel)
      window.setTimeout(() => form.reportValidity(), 0)
      return
    }
    setLoading(true)
    setError('')
    try {
      const pictureChanged = profilePic !== initialPic
      await Promise.all([
        api.updateStudent(student.id, name.trim(), phone || undefined, birthday || undefined, studentId || undefined, pictureChanged ? profilePic : undefined, status, parentPhones, registrationDate || undefined, categoryIds, customFieldValues, quranProgressEnabled),
        api.updateExcusedWeekdays(student.id, excusedWeekdays),
      ])
      toast('تم حفظ بيانات الطالب', { tone: 'success' })
      onUpdated()
    } catch (err: any) {
      setError(err.message || 'فشل التحديث')
      setTab('basic')
    } finally {
      setLoading(false)
    }
  }

  const activePeriod = excusedPeriods.some(period => period.status === 'active')

  const toolbar = (
    <div role="tablist" aria-label="أقسام بيانات الطالب" className="mobile-scroll-tabs -mx-1 flex gap-1 overflow-x-auto px-1">
      {TABS.map(item => {
        const count = item.key === 'warnings' ? warnings.length : item.key === 'parents' ? parentPhones.length : 0
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${tab === item.key ? 'border-cyan-500 text-blue-700 dark:text-blue-300' : 'border-transparent text-deep-500 hover:text-deep-800'}`}
          >
            {item.label}
            {count > 0 && <span className="rounded-full bg-water-100 px-1.5 text-xs text-deep-600 dark:bg-slate-700 dark:text-slate-200">{count}</span>}
            {item.key === 'excuses' && activePeriod && <span className="h-2 w-2 rounded-full bg-amber-500" aria-label="عذر نشط" />}
          </button>
        )
      })}
    </div>
  )

  const footer = (
    <div className="flex flex-wrap items-center gap-3">
      <span className={`text-xs font-semibold ${dirty ? 'text-amber-700 dark:text-amber-300' : 'text-deep-500'}`}>{dirty ? 'لديك تغييرات غير محفوظة' : 'لا توجد تغييرات'}</span>
      <div className="ms-auto flex gap-2">
        <button type="button" onClick={() => void requestClose()} className="water-btn-outline rounded-xl px-5 py-2.5 text-sm">إلغاء</button>
        <button type="submit" form="edit-student-form" disabled={loading || !dirty} className="water-btn rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button>
      </div>
    </div>
  )

  return (
    <Modal title={`تعديل الطالب — ${student.name}`} onClose={() => void requestClose()} wide toolbar={toolbar} footer={footer}>
      <ErrorMsg error={error} />
      <form id="edit-student-form" ref={formRef} onSubmit={handleSubmit} noValidate className="pt-3">
        {/* ── Basic ─────────────────────────────── */}
        <div data-tab="basic" hidden={tab !== 'basic'} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              {profilePic
                ? <img src={mediaUrl(profilePic) || profilePic} alt="" className="h-16 w-16 shrink-0 rounded-full border border-water-300 object-cover" />
                : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-water-300 bg-water-100 text-2xl font-bold text-blue-700 dark:bg-slate-800">{name.charAt(0) || '؟'}</span>}
              <div className="flex flex-col gap-1.5">
                <label className={`water-btn-outline inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold ${uploadingPic ? 'pointer-events-none opacity-50' : ''}`}>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPic}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingPic(true)
                      setError('')
                      try {
                        const compressed = await compressProfileImage(file)
                        const result = await api.uploadStudentPic(student.id, compressed)
                        setProfilePic(result.url)
                        changedOnServer.current = true
                      } catch (err: any) {
                        setError(err.message || 'فشل رفع الصورة')
                      } finally {
                        setUploadingPic(false)
                        e.target.value = ''
                      }
                    }}
                    className="hidden"
                  />
                  {uploadingPic ? 'جارٍ الرفع...' : profilePic ? 'تغيير الصورة' : 'إضافة صورة'}
                </label>
                {profilePic && <button type="button" onClick={() => setProfilePic('')} className="text-xs font-semibold text-red-500 hover:text-red-700">إزالة الصورة</button>}
              </div>
            </div>
            <p className="text-xs leading-5 text-deep-500 sm:ms-auto sm:max-w-56">رفع صورة جديدة يُحفظ فوراً. إزالة الصورة تُطبّق عند الضغط على «حفظ التعديلات».</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`${LABEL} sm:col-span-2`}>
              الاسم <span className="text-red-500">*</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={`${FIELD} mt-1.5 font-normal`} />
            </label>
            <label className={LABEL}>
              هاتف الطالب <span className="font-normal text-deep-400">(اختياري)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" dir="ltr" autoComplete="off" placeholder="01xxxxxxxxx" className={`${FIELD} mt-1.5 text-left font-normal`} />
            </label>
            <label className={LABEL}>
              رقم الطالب <span className="font-normal text-deep-400">(اختياري)</span>
              <input value={studentId} onChange={(e) => setStudentId(e.target.value)} className={`${FIELD} mt-1.5 font-normal`} />
            </label>
            <label className={LABEL}>
              تاريخ الميلاد
              <input value={birthday} onChange={(e) => setBirthday(e.target.value)} type="date" className={`${FIELD} mt-1.5 font-normal`} />
            </label>
            <label className={LABEL}>
              تاريخ التسجيل
              <input value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} type="date" className={`${FIELD} mt-1.5 font-normal`} />
            </label>
            <label className={LABEL}>
              الحالة
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${FIELD} mt-1.5 font-normal`}>
                {STUDENT_STATUSES.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-3 self-end rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 text-sm font-semibold text-deep-800 dark:border-cyan-900 dark:bg-cyan-950/25">
              <input type="checkbox" checked={quranProgressEnabled} onChange={event => setQuranProgressEnabled(event.target.checked)} />
              متابعة حفظ هذا الطالب
            </label>
          </div>
          <StudentCategoryPicker selected={categoryIds} onChange={setCategoryIds} />
        </div>

        {/* ── Parents ───────────────────────────── */}
        <div data-tab="parents" hidden={tab !== 'parents'} className="space-y-3">
          <p className="text-xs text-deep-500">أرقام التواصل مع أولياء الأمور. تظهر في ملف الطالب ويمكن الاتصال بها مباشرة.</p>
          {parentPhones.length === 0 && <p className="rounded-xl border border-dashed border-water-300 py-6 text-center text-sm text-deep-500">لا توجد أرقام بعد.</p>}
          {parentPhones.map((pp, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-water-200/70 bg-water-50/40 p-3 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto] sm:items-end dark:bg-slate-800/40">
              <label className="text-xs font-semibold text-deep-600">رقم الهاتف
                <input value={pp.phone_number || ''} onChange={(e) => updateParentPhone(i, 'phone_number', e.target.value)} type="tel" inputMode="tel" dir="ltr" required placeholder="01xxxxxxxxx" className="surface-field mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-deep-600">الصلة
                <select value={pp.parent_type || 'أب'} onChange={(e) => updateParentPhone(i, 'parent_type', e.target.value)} className="surface-field mt-1 w-full rounded-xl px-3 py-2 text-sm font-normal">
                  {PARENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-deep-600">الاسم <span className="font-normal text-deep-400">(اختياري)</span>
                <input value={pp.name || ''} onChange={(e) => updateParentPhone(i, 'name', e.target.value)} className="surface-field mt-1 w-full rounded-xl px-3 py-2 text-sm font-normal" />
              </label>
              <button type="button" onClick={() => setParentPhones(current => current.filter((_, idx) => idx !== i))} aria-label={`حذف رقم ${pp.phone_number || i + 1}`} className="justify-self-end rounded-xl px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">حذف</button>
            </div>
          ))}
          <button type="button" onClick={() => setParentPhones(current => [...current, { phone_number: '', parent_type: 'أب', name: '' }])} className="water-btn-outline inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold">
            <Icon name="plus" className="h-4 w-4" /> إضافة رقم
          </button>
        </div>

        {/* ── Excuses ───────────────────────────── */}
        <div data-tab="excuses" hidden={tab !== 'excuses'} className="space-y-6">
          <section>
            <h3 className="text-sm font-bold text-deep-800">أيام العذر الأسبوعية</h3>
            <p className="mt-1 text-xs text-deep-500">أيام ثابتة لا يُحتسب فيها غياب الطالب (تُسجَّل «لا ينطبق» تلقائياً).</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {WEEKDAY_NAMES.map((dayName, i) => {
                const selected = excusedWeekdays.some((d) => d.weekday === i)
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleExcusedWeekday(i)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${selected
                      ? 'border-yellow-300 bg-yellow-100/60 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                      : 'border-water-300 bg-white/50 text-deep-500 hover:bg-water-100/30 dark:bg-slate-800/50 dark:text-deep-400'}`}
                  >
                    {dayName}
                  </button>
                )
              })}
            </div>
            {excusedWeekdays.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {excusedWeekdays.slice().sort((a, b) => a.weekday - b.weekday).map((day) => (
                  <label key={day.weekday} className="block text-xs font-semibold text-deep-600">
                    سبب عذر يوم {WEEKDAY_NAMES[day.weekday]}
                    <input
                      value={day.note || ''}
                      onChange={(e) => updateExcusedWeekdayNote(day.weekday, e.target.value)}
                      placeholder="مثال: لديه دوام ثابت في هذا اليوم"
                      className="surface-field mt-1 w-full rounded-xl px-3 py-2 text-sm font-normal"
                    />
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="border-t border-water-200/50 pt-5 dark:border-slate-700/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-deep-800">فترات الغياب بعذر <SavesImmediately /></h3>
                <p className="mt-1 text-xs text-deep-500">للسفر أو المرض أو أي عذر ممتد.</p>
              </div>
              {activePeriod && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">عذر نشط</span>}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-deep-600">من تاريخ<input type="date" value={periodForm.start_date} onChange={event => setPeriodForm({ ...periodForm, start_date: event.target.value })} className="surface-field mt-1 w-full rounded-xl px-3 py-2 font-normal" /></label>
              <label className="text-xs font-semibold text-deep-600">إلى تاريخ<input type="date" min={periodForm.start_date || undefined} value={periodForm.end_date} onChange={event => setPeriodForm({ ...periodForm, end_date: event.target.value })} className="surface-field mt-1 w-full rounded-xl px-3 py-2 font-normal" /></label>
              <label className="text-xs font-semibold text-deep-600 sm:col-span-2">سبب العذر<textarea rows={2} maxLength={1000} value={periodForm.reason} onChange={event => setPeriodForm({ ...periodForm, reason: event.target.value })} placeholder="مثال: سفر مع الأسرة" className="surface-field mt-1 w-full rounded-xl px-3 py-2 font-normal" /></label>
            </div>
            {periodError && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{periodError}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={periodBusy} onClick={() => void saveExcusedPeriod()} className="water-btn rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{periodBusy ? 'جارٍ الحفظ...' : editingPeriodId ? 'حفظ تعديل الفترة' : 'إضافة فترة عذر'}</button>
              {editingPeriodId && <button type="button" disabled={periodBusy} onClick={resetPeriodForm} className="water-btn-outline rounded-xl px-4 py-2 text-xs">إلغاء التعديل</button>}
            </div>
            <div className="mt-4 space-y-2">
              {excusedPeriods.length === 0 ? <p className="text-xs text-deep-500">لا توجد فترات عذر مسجلة.</p> : excusedPeriods.map(period => (
                <article key={period.id} className="rounded-xl border border-water-200 bg-white/35 p-3 dark:bg-slate-800/30">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-sm font-bold text-deep-800">{period.reason}</p><p className="mt-1 text-xs text-deep-500"><span dir="ltr">{period.start_date}</span> — <span dir="ltr">{period.end_date}</span></p></div>
                    <span className="shrink-0 rounded-full bg-water-50 px-2 py-1 text-xs text-deep-700 dark:bg-slate-800">{excusedPeriodStatusLabel(period.status)}</span>
                  </div>
                  {period.status !== 'cancelled' && (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <button type="button" disabled={periodBusy} onClick={() => startEditingPeriod(period)} className="text-xs font-semibold text-blue-700 dark:text-blue-300">تعديل</button>
                      {period.status === 'active' && <button type="button" disabled={periodBusy} onClick={() => setEndingPeriod({ id: period.id, date: new Date().toISOString().slice(0, 10) })} className="text-xs font-semibold text-amber-700 dark:text-amber-300">عودة مبكرة</button>}
                      {(period.status === 'active' || period.status === 'upcoming') && <button type="button" disabled={periodBusy} onClick={() => void cancelExcusedPeriod(period)} className="text-xs font-semibold text-red-600 dark:text-red-300">إلغاء الفترة</button>}
                    </div>
                  )}
                  {endingPeriod?.id === period.id && (
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-amber-50/70 p-3 dark:bg-amber-950/30">
                      <label className="text-xs font-semibold text-deep-700">آخر يوم للعذر
                        <input type="date" value={endingPeriod.date} min={period.start_date} max={period.end_date} onChange={event => setEndingPeriod({ id: period.id, date: event.target.value })} className="surface-field mt-1 block rounded-xl px-3 py-1.5 text-sm font-normal" />
                      </label>
                      <button type="button" disabled={periodBusy || !endingPeriod.date} onClick={() => void endExcusedPeriodEarly()} className="water-btn rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50">تأكيد العودة</button>
                      <button type="button" onClick={() => setEndingPeriod(null)} className="rounded-xl px-3 py-2 text-xs text-deep-500">تراجع</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* ── Warnings ──────────────────────────── */}
        <div data-tab="warnings" hidden={tab !== 'warnings'} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-deep-800">الإنذارات ({warnings.length})</h3>
            <SavesImmediately />
          </div>
          <div className="flex gap-2">
            <input
              value={newWarningReason}
              onChange={(e) => setNewWarningReason(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAddWarning() } }}
              placeholder="سبب الإنذار"
              aria-label="سبب الإنذار الجديد"
              className="surface-field min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
            />
            <button type="button" onClick={() => void handleAddWarning()} disabled={addingWarning || !newWarningReason.trim()} className="water-btn whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{addingWarning ? 'جارٍ...' : 'إضافة إنذار'}</button>
          </div>
          {warnings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-water-300 py-6 text-center text-sm text-deep-500">لا توجد إنذارات.</p>
          ) : (
            <div className="space-y-2">
              {warnings.map((w) => (
                <div key={w.id} className="flex items-start gap-3 rounded-xl border border-red-200/70 bg-red-50/40 px-3 py-2.5 dark:border-red-900/60 dark:bg-red-900/20">
                  <span className="mt-0.5 grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700 dark:bg-red-900/60 dark:text-red-200">{w.warning_number}</span>
                  <div className="min-w-0 flex-1">
                    {editingWarningId === w.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editingWarningText}
                          onChange={(e) => setEditingWarningText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleSaveWarningEdit() } else if (e.key === 'Escape') { e.stopPropagation(); setEditingWarningId(null) } }}
                          aria-label="نص الإنذار"
                          className="surface-field min-w-0 flex-1 rounded-xl px-2 py-1 text-sm"
                          autoFocus
                        />
                        <button type="button" onClick={() => void handleSaveWarningEdit()} disabled={savingWarningEdit || !editingWarningText.trim()} className="px-1 text-xs font-semibold text-emerald-700 disabled:opacity-40 dark:text-emerald-300">{savingWarningEdit ? '...' : 'حفظ'}</button>
                        <button type="button" onClick={() => setEditingWarningId(null)} className="px-1 text-xs text-deep-500">إلغاء</button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-deep-800">{w.reason}</p>
                        <p className="text-xs text-deep-400">{new Date(w.created_at).toLocaleDateString('ar-EG')}</p>
                      </>
                    )}
                  </div>
                  {editingWarningId !== w.id && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => { setEditingWarningId(w.id); setEditingWarningText(w.reason) }} aria-label={`تعديل الإنذار ${w.warning_number}`} className="grid h-8 w-8 place-items-center rounded-lg text-deep-400 hover:bg-water-100/60 hover:text-blue-600"><Icon name="edit" className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void handleDeleteWarning(w)} disabled={deletingWarningId === w.id} aria-label={`حذف الإنذار ${w.warning_number}`} className="grid h-8 w-8 place-items-center rounded-lg text-red-400 hover:bg-red-100/60 hover:text-red-600 disabled:opacity-40"><Icon name="close" className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Custom fields ─────────────────────── */}
        <div data-tab="custom" hidden={tab !== 'custom'}>
          <StudentCustomFieldsEditor values={customFieldValues} onChange={setCustomFieldValues} />
        </div>
      </form>
    </Modal>
  )
}

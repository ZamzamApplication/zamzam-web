'use client'

import { useEffect, useState } from 'react'

import { api } from '@/lib/api'
import { SURAHS, surahInfo } from '@/lib/quran'
import type { StudentQuranPlan, WardCategory } from '@/lib/types'

const CATEGORY_LABELS: Record<WardCategory, string> = {
  new_memorization: 'الحفظ',
  recent_revision: 'المراجعة القريبة',
  old_revision: 'المراجعة البعيدة',
}

type QuranPlanDraft = Omit<StudentQuranPlan, 'id' | 'student_id' | 'updated_at'>

function defaultPlan(category: WardCategory): QuranPlanDraft {
  return { category, increment_unit: 'ayahs', increment_amount: 1, next_surah: 1, next_ayah: 1, next_page: null, completed_at: null }
}

export default function StudentQuranPlanEditor({ studentId, initiallyEnabled, configuredCategories }: {
  studentId: number
  initiallyEnabled: boolean
  configuredCategories: WardCategory[]
}) {
  const [studentEnabled, setStudentEnabled] = useState(initiallyEnabled)
  const [categories, setCategories] = useState<WardCategory[]>(configuredCategories)
  const [plans, setPlans] = useState<QuranPlanDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoaded(false)
    setError('')
    api.getStudentQuranPlans(studentId)
      .then(result => {
        if (cancelled) return
        setStudentEnabled(result.student_enabled)
        setCategories(result.categories)
        setPlans(result.plans.map(plan => ({
          category: plan.category, increment_unit: plan.increment_unit, increment_amount: plan.increment_amount,
          next_surah: plan.next_surah, next_ayah: plan.next_ayah, next_page: plan.next_page, completed_at: plan.completed_at,
        })))
        setLoaded(true)
      })
      .catch((reason: any) => { if (!cancelled) setError(reason.message || 'تعذر تحميل خطة الورد') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [studentId])

  const updatePlan = (category: WardCategory, patch: Partial<QuranPlanDraft>) => {
    setNotice('')
    setPlans(current => current.map(plan => plan.category === category ? { ...plan, ...patch, completed_at: null } : plan))
  }

  const toggleStudent = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const next = !studentEnabled
      await api.setStudentProgressTracking(studentId, next)
      setStudentEnabled(next)
      if (next && plans.length === 0 && categories.includes('new_memorization')) setPlans([defaultPlan('new_memorization')])
      setNotice(next ? 'تم تفعيل متابعة الطالب. اضبط خطة الحفظ ثم احفظها.' : 'تم إيقاف المتابعة لهذا الطالب مع الاحتفاظ بسجلاته السابقة.')
    } catch (reason: any) {
      setError(reason.message || 'تعذر تغيير حالة المتابعة')
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await api.updateStudentQuranPlans(studentId, plans)
      setPlans(result.plans.map(plan => ({ ...plan })))
      setNotice('تم حفظ خطة الورد')
    } catch (reason: any) {
      setError(reason.message || 'تعذر حفظ خطة الورد')
    } finally {
      setSaving(false)
    }
  }

  const missingCategories = categories.filter(category => !plans.some(plan => plan.category === category))

  return <section className="glass-card rounded-2xl p-5 md:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-bold text-deep-900">خطة الورد</h2><p className="mt-1 text-xs text-deep-500">تظهر الخطة فقط للطلاب الذين تختار متابعتهم، وتتقدم تلقائياً بعد حفظ مقدار مطابق.</p></div>
      <button type="button" disabled={saving || loading} onClick={() => void toggleStudent()} className={studentEnabled ? 'water-btn-outline rounded-xl px-4 py-2 text-xs font-bold' : 'water-btn rounded-xl px-4 py-2 text-xs font-bold text-white'}>{studentEnabled ? 'إيقاف المتابعة' : 'بدء متابعة الطالب'}</button>
    </div>

    {loading ? <p className="mt-5 text-sm text-deep-500">جاري تحميل خطة الورد...</p> : studentEnabled && <>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {plans.map(plan => {
          const maxAyah = surahInfo(plan.next_surah || 1).ayahs
          return <fieldset key={plan.category} className="rounded-xl border border-cyan-200 bg-cyan-50/35 p-4 dark:border-cyan-900 dark:bg-cyan-950/15">
            <legend className="px-1 text-sm font-bold text-deep-800">{CATEGORY_LABELS[plan.category]}</legend>
            {plan.completed_at && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">اكتمل الورد ✓ — عدّل نقطة البداية لبدء دورة جديدة.</p>}
            <div className="mt-1 grid grid-cols-2 gap-3">
              <label className="text-xs text-deep-600">الوحدة<select value={plan.increment_unit} onChange={event => {
                const unit = event.target.value as QuranPlanDraft['increment_unit']
                updatePlan(plan.category, { increment_unit: unit, next_page: unit === 'pages' ? (plan.next_page || 1) : null, next_surah: unit === 'pages' ? null : (plan.next_surah || 1), next_ayah: unit === 'pages' ? null : (plan.next_ayah || 1) })
              }} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm"><option value="ayahs">آيات</option><option value="lines">أسطر</option><option value="half_page">نصف صفحة</option><option value="pages">صفحة</option><option value="quarter">ربع</option><option value="hizb">حزب</option><option value="juz">جزء</option></select></label>
              <label className="text-xs text-deep-600">المقدار<input type="number" min={1} max={604} value={plan.increment_amount} onChange={event => updatePlan(plan.category, { increment_amount: Math.max(1, Number(event.target.value)) })} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm" /></label>
              {plan.increment_unit === 'pages' ? <label className="col-span-2 text-xs text-deep-600">بداية الورد القادم<input type="number" min={1} max={604} value={plan.next_page || 1} onChange={event => updatePlan(plan.category, { next_page: Number(event.target.value) })} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm" /></label> : <>
                <label className="text-xs text-deep-600">السورة<select value={plan.next_surah || 1} onChange={event => updatePlan(plan.category, { next_surah: Number(event.target.value), next_ayah: 1 })} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm">{SURAHS.map(surah => <option key={surah.number} value={surah.number}>{surah.number}. {surah.name}</option>)}</select></label>
                <label className="text-xs text-deep-600">الآية<input type="number" min={1} max={maxAyah} value={Math.min(plan.next_ayah || 1, maxAyah)} onChange={event => updatePlan(plan.category, { next_ayah: Number(event.target.value) })} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm" /></label>
              </>}
            </div>
            <button type="button" onClick={() => setPlans(current => current.filter(item => item.category !== plan.category))} className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300">إزالة هذه الخطة</button>
          </fieldset>
        })}
      </div>
      {missingCategories.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-deep-600">إضافة خطة:</span>{missingCategories.map(category => <button key={category} type="button" onClick={() => setPlans(current => [...current, defaultPlan(category)])} className="water-btn-outline rounded-lg px-3 py-2 text-xs font-bold">+ {CATEGORY_LABELS[category]}</button>)}</div>}
      <button type="button" disabled={!loaded || saving} onClick={() => void save()} className="water-btn mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'حفظ خطة الورد'}</button>
    </>}
    {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>}
    {notice && <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{notice}</p>}
  </section>
}

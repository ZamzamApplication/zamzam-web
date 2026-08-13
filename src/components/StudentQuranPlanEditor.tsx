'use client'

import { useEffect, useState } from 'react'

import { api } from '@/lib/api'
import { SURAHS, surahInfo } from '@/lib/quran'
import type { StudentQuranPlan, WardCategory } from '@/lib/types'

const WARD_CATEGORIES: { category: WardCategory; label: string }[] = [
  { category: 'new_memorization', label: 'الحفظ الجديد' },
  { category: 'recent_revision', label: 'المراجعة القريبة' },
  { category: 'old_revision', label: 'المراجعة البعيدة' },
]

type QuranPlanDraft = Omit<StudentQuranPlan, 'id' | 'student_id' | 'updated_at'>

function defaultQuranPlans(): QuranPlanDraft[] {
  return WARD_CATEGORIES.map(({ category }) => ({
    category,
    increment_unit: 'ayahs',
    increment_amount: 1,
    next_surah: 1,
    next_ayah: 1,
    next_page: null,
  }))
}

export default function StudentQuranPlanEditor({ studentId }: { studentId: number }) {
  const [plans, setPlans] = useState<QuranPlanDraft[]>(defaultQuranPlans)
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
      .then(({ plans: savedPlans }) => {
        if (cancelled) return
        const savedByCategory = new Map(savedPlans.map(plan => [plan.category, plan]))
        setPlans(defaultQuranPlans().map(defaultPlan => {
          const saved = savedByCategory.get(defaultPlan.category)
          return saved ? {
            category: saved.category,
            increment_unit: saved.increment_unit,
            increment_amount: saved.increment_amount,
            next_surah: saved.next_surah,
            next_ayah: saved.next_ayah,
            next_page: saved.next_page,
          } : defaultPlan
        }))
        setLoaded(true)
      })
      .catch((reason: any) => {
        if (!cancelled) setError(reason.message || 'تعذر تحميل خطة الورد')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [studentId])

  const updatePlan = (category: WardCategory, patch: Partial<QuranPlanDraft>) => {
    setNotice('')
    setPlans(current => current.map(plan => plan.category === category ? { ...plan, ...patch } : plan))
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.updateStudentQuranPlans(studentId, plans)
      setNotice('تم حفظ خطة الورد')
    } catch (reason: any) {
      setError(reason.message || 'تعذر حفظ خطة الورد')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="glass-card rounded-2xl p-5 md:p-7">
      <div>
        <h2 className="font-bold text-deep-900">خطة الورد</h2>
        <p className="mt-1 text-xs text-deep-500">تُحفظ لكل طالب وتُنشئ مقدار الحفظ والمراجعة تلقائياً في الحلقة.</p>
      </div>

      {loading ? <p className="mt-5 text-sm text-deep-400">جاري تحميل خطة الورد...</p> : (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {WARD_CATEGORIES.map(({ category, label }) => {
            const plan = plans.find(item => item.category === category)!
            const maxAyah = surahInfo(plan.next_surah || 1).ayahs
            return (
              <fieldset key={category} className="rounded-xl border border-cyan-200 bg-cyan-50/35 p-4 dark:border-cyan-900 dark:bg-cyan-950/15">
                <legend className="px-1 text-sm font-bold text-deep-800">{label}</legend>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <label className="text-xs text-deep-600">الوحدة
                    <select value={plan.increment_unit} onChange={event => {
                      const unit = event.target.value as QuranPlanDraft['increment_unit']
                      updatePlan(category, {
                        increment_unit: unit,
                        next_page: unit === 'pages' ? (plan.next_page || 1) : null,
                        next_surah: unit === 'pages' ? null : (plan.next_surah || 1),
                        next_ayah: unit === 'pages' ? null : (plan.next_ayah || 1),
                      })
                    }} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm">
                      <option value="ayahs">آيات</option>
                      <option value="lines">أسطر</option>
                      <option value="pages">صفحات</option>
                    </select>
                  </label>
                  <label className="text-xs text-deep-600">المقدار
                    <input type="number" min={1} max={604} value={plan.increment_amount} onChange={event => updatePlan(category, { increment_amount: Math.max(1, Number(event.target.value)) })} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm" />
                  </label>
                  {plan.increment_unit === 'pages' ? (
                    <label className="col-span-2 text-xs text-deep-600">بداية الورد القادم
                      <input type="number" min={1} max={604} value={plan.next_page || 1} onChange={event => updatePlan(category, { next_page: Number(event.target.value) })} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm" />
                    </label>
                  ) : <>
                    <label className="text-xs text-deep-600">السورة
                      <select value={plan.next_surah || 1} onChange={event => updatePlan(category, { next_surah: Number(event.target.value), next_ayah: 1 })} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm">
                        {SURAHS.map(surah => <option key={surah.number} value={surah.number}>{surah.number}. {surah.name}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-deep-600">الآية
                      <input type="number" min={1} max={maxAyah} value={Math.min(plan.next_ayah || 1, maxAyah)} onChange={event => updatePlan(category, { next_ayah: Number(event.target.value) })} className="surface-field mt-1 w-full rounded-lg px-2 py-2 text-sm" />
                    </label>
                  </>}
                </div>
              </fieldset>
            )
          })}
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button type="button" disabled={!loaded || loading || saving} onClick={() => void save()} className="water-btn rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'حفظ خطة الورد'}</button>
        {notice && <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{notice}</span>}
      </div>
    </section>
  )
}

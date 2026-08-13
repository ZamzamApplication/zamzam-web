'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import type { StudentCategory, StudentInfo } from '@/lib/types'
import { toggleCategorySelection } from '@/lib/student-categories'

function todayLocalDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CreateSessionModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (sessionId: number) => void
}) {
  const [sessionDate, setSessionDate] = useState(todayLocalDate)
  const [sessionName, setSessionName] = useState('')
  const [multipleEnabled, setMultipleEnabled] = useState(false)
  const [categories, setCategories] = useState<StudentCategory[]>([])
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set())
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.getMe().then(async user => {
      const enabled = Boolean(user.tahfiz?.multiple_sessions_per_day_enabled)
      if (cancelled) return
      setMultipleEnabled(enabled)
      if (!enabled) return
      const [categoryRows, studentRows] = await Promise.all([api.getStudentCategories(), api.getStudents()])
      if (cancelled) return
      setCategories(categoryRows)
      setStudents(studentRows.filter(student => student.status === 'مقيد'))
    }).catch((reason: any) => {
      if (!cancelled) setError(reason.message || 'تعذر تحميل خيارات الحلقة')
    }).finally(() => {
      if (!cancelled) setLoadingOptions(false)
    })
    return () => { cancelled = true }
  }, [])

  const studentsBySheikh = useMemo(() => {
    const groups = new Map<string, StudentInfo[]>()
    students.forEach(student => {
      const key = student.sheikh?.name || 'بدون شيخ'
      groups.set(key, [...(groups.get(key) || []), student])
    })
    return Array.from(groups.entries())
  }, [students])

  const toggleCategory = (categoryId: number) => {
    const next = toggleCategorySelection(selectedCategories, selectedStudents, categoryId, students)
    setSelectedCategories(next.categories)
    setSelectedStudents(next.students)
  }

  const toggleStudent = (studentId: number) => setSelectedStudents(current => {
    const next = new Set(current)
    if (next.has(studentId)) next.delete(studentId)
    else next.add(studentId)
    return next
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!sessionDate || (multipleEnabled && selectedStudents.size === 0)) return
    setError('')
    setLoading(true)
    try {
      const res = await api.createSession(sessionDate, multipleEnabled ? {
        name: sessionName,
        studentIds: Array.from(selectedStudents),
      } : undefined)
      onCreated(res.id)
    } catch (reason: any) {
      setError(reason.message || 'فشل إنشاء الحلقة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className={`mobile-sheet glass-strong max-h-[90vh] overflow-y-auto rounded-2xl p-6 w-full ${multipleEnabled ? 'max-w-2xl' : 'max-w-sm'} mx-4`} onClick={event => event.stopPropagation()}>
        <h2 className="text-xl font-bold text-deep-800 mb-4">إضافة حلقة جديدة</h2>
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-2 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-deep-700">التاريخ
              <input type="date" value={sessionDate} onChange={event => setSessionDate(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" required />
            </label>
            {multipleEnabled && <label className="block text-sm font-medium text-deep-700">اسم الحلقة (اختياري)
              <input value={sessionName} onChange={event => setSessionName(event.target.value)} maxLength={100} placeholder="مثال: المجموعة الصباحية" className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
            </label>}
          </div>

          {multipleEnabled && <>
            <div>
              <p className="text-sm font-bold text-deep-800">اختر التصنيفات</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.length === 0 && <span className="text-xs text-deep-500">لا توجد تصنيفات بعد؛ يمكنك اختيار الطلاب مباشرة.</span>}
                {categories.map(category => <button key={category.id} type="button" onClick={() => toggleCategory(category.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedCategories.has(category.id) ? 'border-cyan-500 bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200' : 'border-water-200 text-deep-600'}`}>
                  {category.name} ({category.student_count || 0})
                </button>)}
              </div>
            </div>
            <div className="rounded-xl border border-water-200/70 bg-white/35 p-3 dark:bg-slate-800/35">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-deep-800">طلاب الحلقة ({selectedStudents.size})</p>
                <button type="button" onClick={() => setSelectedStudents(selectedStudents.size === students.length ? new Set() : new Set(students.map(student => student.id)))} className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                  {selectedStudents.size === students.length ? 'إلغاء اختيار الكل' : 'اختيار الكل'}
                </button>
              </div>
              {loadingOptions ? <p className="py-5 text-center text-sm text-deep-500">جاري تحميل الطلاب...</p> : <div className="max-h-72 space-y-3 overflow-y-auto pl-1">
                {studentsBySheikh.map(([sheikh, rows]) => <section key={sheikh}>
                  <p className="mb-1 text-xs font-bold text-deep-500">{sheikh}</p>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {rows.map(student => <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-water-100/40">
                      <input type="checkbox" checked={selectedStudents.has(student.id)} onChange={() => toggleStudent(student.id)} className="rounded" />
                      <span className="min-w-0 truncate text-sm text-deep-800">{student.name}</span>
                    </label>)}
                  </div>
                </section>)}
              </div>}
            </div>
          </>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm">إلغاء</button>
            <button type="submit" disabled={loading || loadingOptions || (multipleEnabled && selectedStudents.size === 0)} className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50">{loading ? 'جاري...' : 'إضافة'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import type { StudentCategory, StudentInfo } from '@/lib/types'
import { toggleCategorySelection, toggleStudentGroupSelection } from '@/lib/student-categories'

export default function SessionMembershipModal({ sessionId, expectedVersion, initialStudentIds, onClose, onSaved }: {
  sessionId: number
  expectedVersion: number
  initialStudentIds: number[]
  onClose(): void
  onSaved(version: number): void
}) {
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [categories, setCategories] = useState<StudentCategory[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set(initialStudentIds))
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getStudents(), api.getStudentCategories()])
      .then(([studentRows, categoryRows]) => {
        setStudents(studentRows.filter(student => student.status === 'مقيد' || student.status === 'ضيف'))
        setCategories(categoryRows)
      })
      .catch((reason: any) => setError(reason.message || 'تعذر تحميل الطلاب'))
      .finally(() => setLoading(false))
  }, [])

  const groups = useMemo(() => {
    const grouped = new Map<string, StudentInfo[]>()
    students.forEach(student => {
      const key = student.sheikh?.name || 'بدون شيخ'
      grouped.set(key, [...(grouped.get(key) || []), student])
    })
    return Array.from(grouped.entries())
  }, [students])

  const toggleCategory = (categoryId: number) => {
    const next = toggleCategorySelection(selectedCategories, selected, categoryId, students)
    setSelectedCategories(next.categories)
    setSelected(next.students)
  }

  const save = async () => {
    if (selected.size === 0) return
    const removed = initialStudentIds.filter(id => !selected.has(id)).length
    if (removed > 0 && !window.confirm(`سيتم حذف ${removed} طالب من هذه الحلقة وسجل حضوره فيها. هل تريد المتابعة؟`)) return
    setSaving(true)
    setError('')
    try {
      const result = await api.updateSessionMembership(sessionId, Array.from(selected), expectedVersion)
      onSaved(result.version)
    } catch (reason: any) {
      setError(reason.message || 'تعذر تعديل طلاب الحلقة. إذا كان للطالب مقدار قرآن محفوظ فامسحه أولاً.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
    <div className="glass-strong max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6" onClick={event => event.stopPropagation()}>
      <h2 className="text-xl font-bold text-deep-800">تعديل طلاب الحلقة</h2>
      <p className="mt-1 text-xs text-deep-500">التصنيفات أدوات اختيار فقط؛ القائمة النهائية المحفوظة مستقلة عنها.</p>
      {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map(category => <button key={category.id} type="button" onClick={() => toggleCategory(category.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedCategories.has(category.id) ? 'border-cyan-500 bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200' : 'border-water-200 text-deep-600'}`}>{category.name}</button>)}
      </div>
      <div className="mt-4 rounded-xl border border-water-200/70 p-3">
        <div className="mb-3 flex items-center justify-between"><span className="text-sm font-bold text-deep-800">المحددون ({selected.size})</span><button type="button" onClick={() => setSelected(selected.size === students.length ? new Set() : new Set(students.map(student => student.id)))} className="text-xs font-semibold text-cyan-700">{selected.size === students.length ? 'إلغاء الكل' : 'اختيار الكل'}</button></div>
        {loading ? <p className="py-6 text-center text-sm text-deep-500">جاري التحميل...</p> : <div className="max-h-80 space-y-3 overflow-y-auto">
          {groups.map(([sheikh, rows]) => {
            const allSelected = rows.every(student => selected.has(student.id))
            return <section key={sheikh}>
              <label className="mb-1 flex w-fit cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs font-bold text-deep-500 hover:bg-water-100/40">
                <input type="checkbox" checked={allSelected} onChange={() => setSelected(current => toggleStudentGroupSelection(current, rows.map(student => student.id)))} className="rounded" />
                <span>{sheikh}</span>
              </label>
              <div className="grid gap-1 sm:grid-cols-2">{rows.map(student => <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-water-100/40"><input type="checkbox" checked={selected.has(student.id)} onChange={() => setSelected(current => { const next = new Set(current); if (next.has(student.id)) next.delete(student.id); else next.add(student.id); return next })} className="rounded"/><span className="truncate text-sm text-deep-800">{student.name}</span></label>)}</div>
            </section>
          })}
        </div>}
      </div>
      <div className="mt-5 flex gap-3"><button type="button" onClick={onClose} className="water-btn-outline flex-1 rounded-xl px-4 py-2.5">إلغاء</button><button type="button" onClick={() => void save()} disabled={saving || loading || selected.size === 0} className="water-btn flex-1 rounded-xl px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'حفظ الطلاب'}</button></div>
    </div>
  </div>
}

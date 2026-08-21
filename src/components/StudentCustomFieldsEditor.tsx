'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { StudentCustomField, StudentCustomFieldType } from '@/lib/types'

const FIELD_TYPES: { value: StudentCustomFieldType; label: string }[] = [
  { value: 'text', label: 'نص' },
  { value: 'number', label: 'رقم' },
  { value: 'date', label: 'تاريخ' },
  { value: 'checkbox', label: 'نعم / لا' },
  { value: 'select', label: 'قائمة اختيارات' },
]

export default function StudentCustomFieldsEditor({ values, onChange }: {
  values: Record<string, string>
  onChange(values: Record<string, string>): void
}) {
  const [fields, setFields] = useState<StudentCustomField[]>([])
  const [canCreate, setCanCreate] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [fieldType, setFieldType] = useState<StudentCustomFieldType>('text')
  const [optionsText, setOptionsText] = useState('')
  const [required, setRequired] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getStudentCustomFields().then(result => {
      setFields(result.fields)
      setCanCreate(result.can_create)
    }).catch(reason => setError(reason.message || 'تعذر تحميل الحقول المخصصة'))
  }, [])

  const createField = async () => {
    if (!name.trim()) return
    setBusy(true)
    setError('')
    try {
      const options = fieldType === 'select' ? optionsText.split('\n').map(item => item.trim()).filter(Boolean) : []
      const created = await api.createStudentCustomField({ name: name.trim(), field_type: fieldType, options, is_required: required })
      setFields(current => [...current, created])
      setName('')
      setOptionsText('')
      setRequired(false)
      setFieldType('text')
      setShowCreate(false)
    } catch (reason: any) {
      setError(reason.message || 'تعذر إنشاء الحقل')
    } finally {
      setBusy(false)
    }
  }

  const renameField = async (field: StudentCustomField) => {
    const nextName = window.prompt('اسم الحقل', field.name)?.trim()
    if (!nextName || nextName === field.name) return
    setBusy(true)
    setError('')
    try {
      const updated = await api.updateStudentCustomField(field.id, { ...field, name: nextName })
      setFields(current => current.map(item => item.id === field.id ? updated : item))
    } catch (reason: any) {
      setError(reason.message || 'تعذر تعديل الحقل')
    } finally {
      setBusy(false)
    }
  }

  const archiveField = async (field: StudentCustomField) => {
    if (!window.confirm(`أرشفة حقل «${field.name}»؟ ستبقى القيم محفوظة ولن يظهر الحقل في النماذج الجديدة.`)) return
    setBusy(true)
    setError('')
    try {
      await api.updateStudentCustomField(field.id, { ...field, is_active: false })
      setFields(current => current.filter(item => item.id !== field.id))
    } catch (reason: any) {
      setError(reason.message || 'تعذر أرشفة الحقل')
    } finally {
      setBusy(false)
    }
  }

  return <section className="rounded-xl border border-water-200 bg-white/35 p-4 dark:bg-slate-800/35">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-sm font-bold text-deep-800">الحقول المخصصة</h3><p className="mt-1 text-xs text-deep-500">بيانات إضافية للطالب ويمكن إظهارها في Excel.</p></div>
      {canCreate && <button type="button" onClick={() => setShowCreate(current => !current)} className="water-btn-outline rounded-lg px-3 py-1.5 text-xs font-semibold">+ حقل جديد</button>}
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    {fields.some(field => field.can_edit) && <div className="mt-3 flex flex-wrap gap-2">{fields.filter(field => field.can_edit).map(field => <span key={field.id} className="inline-flex items-center gap-2 rounded-full border border-water-200 px-3 py-1.5 text-xs text-deep-700"><span>{field.name}</span><button type="button" disabled={busy} onClick={() => void renameField(field)} aria-label={`تعديل ${field.name}`} className="font-bold text-blue-700">✎</button><button type="button" disabled={busy} onClick={() => void archiveField(field)} aria-label={`أرشفة ${field.name}`} className="font-bold text-red-500">×</button></span>)}</div>}
    {showCreate && <div className="mt-3 grid gap-2 rounded-xl border border-cyan-200 p-3 sm:grid-cols-2">
      <input value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder="اسم الحقل" className="surface-field rounded-lg px-3 py-2 text-sm" />
      <select value={fieldType} onChange={event => setFieldType(event.target.value as StudentCustomFieldType)} className="surface-field rounded-lg px-3 py-2 text-sm">{FIELD_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      {fieldType === 'select' && <textarea value={optionsText} onChange={event => setOptionsText(event.target.value)} rows={3} placeholder={'كل اختيار في سطر\nمثال: المستوى الأول'} className="surface-field rounded-lg px-3 py-2 text-sm sm:col-span-2" />}
      <label className="flex items-center gap-2 text-xs text-deep-600"><input type="checkbox" checked={required} onChange={event => setRequired(event.target.checked)} /> مطلوب</label>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="text-xs text-deep-500">إلغاء</button><button type="button" disabled={busy || !name.trim() || (fieldType === 'select' && !optionsText.trim())} onClick={() => void createField()} className="water-btn rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">إضافة</button></div>
    </div>}
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {fields.map(field => <label key={field.id} className="text-xs font-medium text-deep-700">{field.name}{field.is_required && <span className="text-red-500"> *</span>}
        {field.field_type === 'select' ? <select required={field.is_required} value={values[String(field.id)] || ''} onChange={event => onChange({ ...values, [String(field.id)]: event.target.value })} className="surface-field mt-1 block w-full rounded-lg px-3 py-2 text-sm"><option value="">بدون قيمة</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select>
          : field.field_type === 'checkbox' ? <select required={field.is_required} value={values[String(field.id)] || ''} onChange={event => onChange({ ...values, [String(field.id)]: event.target.value })} className="surface-field mt-1 block w-full rounded-lg px-3 py-2 text-sm"><option value="">بدون قيمة</option><option value="true">نعم</option><option value="false">لا</option></select>
          : <input type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'} required={field.is_required} value={values[String(field.id)] || ''} onChange={event => onChange({ ...values, [String(field.id)]: event.target.value })} maxLength={field.field_type === 'text' ? 2000 : undefined} className="surface-field mt-1 block w-full rounded-lg px-3 py-2 text-sm" />}
      </label>)}
      {fields.length === 0 && !showCreate && <p className="text-xs text-deep-500 sm:col-span-2">لا توجد حقول مخصصة بعد.</p>}
    </div>
  </section>
}

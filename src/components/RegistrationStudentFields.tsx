'use client'
import {
  STUDENT_FORM_FIELDS,
  type RegistrationStudentData,
  type StudentFormField,
  type StudentFieldOptions,
} from '@/lib/student-registration'

const parentTypes = ['أب', 'أم', 'أخ', 'أخت', 'جد', 'جدة', 'أرضي']
const statuses = ['مقيد', 'مستبعد', 'منقطع', 'ضيف', 'غير مقيد']
const inputClass = 'surface-field mt-2 w-full rounded-xl px-4 py-3 font-normal'

export default function RegistrationStudentFields({ fields, requiredFields = [], options = {}, value, onChange }: {
  fields: StudentFormField[]
  requiredFields?: StudentFormField[]
  options?: StudentFieldOptions
  value: RegistrationStudentData
  onChange: (value: RegistrationStudentData) => void
}) {
  function update(key: StudentFormField, next: unknown) {
    onChange({ ...value, [key]: next })
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {STUDENT_FORM_FIELDS.filter(field => fields.includes(field.id)).map(field => {
        const required = requiredFields.includes(field.id)
        const label = `${field.label}${required ? ' *' : ''}`
        if (field.id === 'parent_phones') {
          const parents = value.parent_phones?.length ? value.parent_phones : required
            ? [{ phone_number: '', parent_type: 'أب', name: '' }] : []
          return (
            <fieldset key={field.id} className="space-y-3 sm:col-span-2">
              <legend className="text-sm font-semibold text-deep-700">{label}</legend>
              {parents.map((parent, index) => {
                function change(key: string, next: string) {
                  update('parent_phones', parents.map((p, i) => i === index ? { ...p, [key]: next } : p))
                }
                return (
                  <div key={index} className="grid gap-3 rounded-xl border border-cyan-100 p-3 dark:border-slate-700 sm:grid-cols-3">
                    <label className="text-sm">صلة القرابة
                      <select className={inputClass} value={parent.parent_type} onChange={e => change('parent_type', e.target.value)}>
                        {parentTypes.map(type => <option key={type}>{type}</option>)}
                      </select>
                    </label>
                    <label className="text-sm">اسم ولي الأمر
                      <input className={inputClass} maxLength={100} value={parent.name || ''} onChange={e => change('name', e.target.value)} />
                    </label>
                    <label className="text-sm">رقم ولي الأمر *
                      <input type="tel" dir="ltr" required minLength={3} maxLength={20} className={inputClass} value={parent.phone_number} onChange={e => change('phone_number', e.target.value)} />
                    </label>
                    {(!required || parents.length > 1) && <button type="button" className="text-sm text-red-600" onClick={() => update('parent_phones', parents.filter((_, i) => i !== index))}>حذف رقم ولي الأمر {index + 1}</button>}
                  </div>
                )
              })}
              {parents.length < 20 && <button type="button" className="water-btn-outline rounded-lg px-3 py-2 text-sm" onClick={() => update('parent_phones', [...parents, { phone_number: '', parent_type: 'أب', name: '' }])}>إضافة ولي أمر</button>}
            </fieldset>
          )
        }
        if (field.id === 'category_ids') return (
          <label key={field.id} className="block text-sm font-semibold text-deep-700">{label}
            <select multiple required={required} className={inputClass} value={(value.category_ids || []).map(String)} onChange={e => update('category_ids', Array.from(e.target.selectedOptions, option => Number(option.value)))}>
              {(options.category_ids || []).map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
            <small className="font-normal">يمكن اختيار أكثر من تصنيف.</small>
          </label>
        )
        const current = value[field.id]
        return (
          <label key={field.id} className="block text-sm font-semibold text-deep-700">{label}
            {field.type === 'select' || field.type === 'boolean' ? (
              <select className={inputClass} required={required} value={current == null ? '' : String(current)} onChange={e => {
                const next = e.target.value
                update(field.id, next === '' ? undefined : field.id === 'sheikh_id' ? Number(next) : field.id === 'quran_progress_enabled' ? next === 'true' : next)
              }}>
                <option value="">اختر</option>
                {field.id === 'sheikh_id' ? (options.sheikh_id || []).map(option => <option key={option.id} value={option.id}>{option.name}</option>)
                  : field.id === 'status' ? statuses.map(status => <option key={status}>{status}</option>)
                  : <><option value="true">نعم</option><option value="false">لا</option></>}
              </select>
            ) : (
              <input className={inputClass} type={field.type} required={required} autoComplete={field.id === 'phone' ? 'tel' : undefined} dir={field.id === 'phone' ? 'ltr' : undefined} maxLength={field.id === 'phone' ? 20 : field.id === 'student_id' ? 50 : undefined} value={current == null ? '' : String(current)} onChange={e => update(field.id, e.target.value)} />
            )}
          </label>
        )
      })}
    </div>
  )
}

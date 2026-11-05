'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from '@/lib/api'
import type {
  RegistrationField,
  RegistrationForm,
  RegistrationRequest,
} from '@/lib/student-registration'
import { REGISTRATION_API as base } from '@/lib/student-registration'
import RegistrationFields from '@/components/RegistrationFields'
import RegistrationStudentFields from '@/components/RegistrationStudentFields'
import { STUDENT_FORM_FIELDS, DEFAULT_STUDENT_FIELDS, approvalStudentData, studentFieldSummary, type StudentFormField, type RegistrationStudentData } from '@/lib/student-registration'
import StudentCustomFieldsEditor from '@/components/StudentCustomFieldsEditor'

export default function RegistrationManagement() {
  const approvalRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [forms, setForms] = useState<RegistrationForm[]>([]),
    [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [fields, setFields] = useState<RegistrationField[]>([]),
    [sheikhs, setSheikhs] = useState<{ id: number; name: string }[]>([])
  const [status, setStatus] = useState('pending'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<number | null>(null),
    [title, setTitle] = useState('طلب الالتحاق بالتحفيظ'),
    [description, setDescription] = useState(''),
    [publicIds, setPublicIds] = useState<number[]>([]),
    [active, setActive] = useState(true)
  const [studentFields, setStudentFields] = useState<StudentFormField[]>(DEFAULT_STUDENT_FIELDS)
  const [requiredStudentFields, setRequiredStudentFields] = useState<StudentFormField[]>([])
  const [studentData, setStudentData] = useState<RegistrationStudentData>({})
  const [categories, setCategories] = useState<{id: number; name: string}[]>([])
  const [selected, setSelected] = useState<RegistrationRequest | null>(null),
    [values, setValues] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const load = useCallback(async () => {
    try {
      const [f, r, custom, teachers, studentCategories] = await Promise.all([
        request<RegistrationForm[]>(`${base}/forms`),
        request<RegistrationRequest[]>(`${base}/requests?status=${status}`),
        request<{ fields: RegistrationField[] }>('/student-custom-fields'),
        request<{ id: number; name: string }[]>('/sheikhs'),
        request<{ id: number; name: string }[]>('/student-categories'),
      ])
      setForms(f)
      setRequests(r)
      setFields(custom.fields)
      setSheikhs(teachers)
      setCategories(studentCategories)
    } catch (e: any) {
      setError(e.message)
    }
  }, [status])
  useEffect(() => {
    void load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])
  useEffect(() => {
    if (!selected) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    approvalRef.current?.querySelector<HTMLInputElement>('input')?.focus()
    return () => {
      document.body.style.overflow = overflow
      triggerRef.current?.focus()
    }
  }, [selected?.id])
  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  function resetForm() {
    setEditing(null)
    setTitle('طلب الالتحاق بالتحفيظ')
    setDescription('')
    setPublicIds([])
    setStudentFields(DEFAULT_STUDENT_FIELDS)
    setRequiredStudentFields([])
    setActive(true)
  }
  function openApproval(row: RegistrationRequest) {
    triggerRef.current = document.activeElement as HTMLElement | null
    setSelected(row)
    setName(row.name)
    setStudentData({ ...row.student_data, phone: row.phone, birthday: row.birthday })
    setValues(
      Object.fromEntries(
        Object.entries(row.answers)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      )
    )
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold">تسجيل الطلاب العام</h1>
        <p className="mt-2 text-sm text-deep-500">
          أنشئ نموذجاً، شارك رمز QR، ثم راجع الطلبات وأكمل بيانات الطلاب قبل
          إضافتهم.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-emerald-800"
        >
          {notice}
        </p>
      )}
      <section className="glass-card space-y-4 rounded-2xl p-5">
        <h2 className="text-lg font-bold">
          {editing ? 'تعديل النموذج' : 'إنشاء نموذج تسجيل'}
        </h2>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              await request(`${base}/forms${editing ? `/${editing}` : ''}`, {
                method: editing ? 'PUT' : 'POST',
                body: JSON.stringify({
                  title,
                  description,
                  public_field_ids: publicIds,
                  student_fields: studentFields,
                  required_student_fields: requiredStudentFields,
                  is_active: active,
                }),
              })
              resetForm()
              setNotice('تم حفظ النموذج')
            })
          }}
        >
          <label className="block">
            عنوان النموذج
            <input
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="surface-field rounded-xl px-3 py-2 mt-2 w-full"
            />
          </label>
          <label className="block">
            نص الترحيب والملصق
            <textarea
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="surface-field rounded-xl px-3 py-2 mt-2 w-full"
            />
          </label>
          <fieldset className="space-y-3">
            <legend className="font-semibold">بيانات الطالب من جدول الطلاب</legend>
            <p className="text-sm text-deep-500">اسم الطالب مطلوب دائماً. اختر البيانات التي تظهر في النموذج وحدد المطلوب منها. تُراجع جميع البيانات قبل القبول.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {STUDENT_FORM_FIELDS.map(field => (
                <div key={field.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-100 p-3 dark:border-slate-700">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={studentFields.includes(field.id)} onChange={event => {
                      setStudentFields(ids => event.target.checked ? [...ids, field.id] : ids.filter(id => id !== field.id))
                      if (!event.target.checked) setRequiredStudentFields(ids => ids.filter(id => id !== field.id))
                    }} />
                    {field.label}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" disabled={!studentFields.includes(field.id)} checked={requiredStudentFields.includes(field.id)} onChange={event => setRequiredStudentFields(ids => event.target.checked ? [...ids, field.id] : ids.filter(id => id !== field.id))} aria-label={`${field.label} مطلوب`} />
                    مطلوب
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
          <h3 className="font-semibold">الحقول المخصصة من جدول الطلاب</h3>
          <div className="flex flex-wrap gap-4">
            {fields.map((f) => (
              <label key={f.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={publicIds.includes(f.id)}
                  onChange={(e) =>
                    setPublicIds((ids) =>
                      e.target.checked
                        ? [...ids, f.id]
                        : ids.filter((id) => id !== f.id)
                    )
                  }
                />
                {f.name}
                {f.is_required && ' *'}
              </label>
            ))}
          </div>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            استقبال الطلبات
          </label>
          <div className="flex gap-3">
            <button disabled={busy} className="water-btn rounded-lg px-4 py-2">
              حفظ النموذج
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="water-btn-outline rounded-lg px-4 py-2"
              >
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>
        <details>
          <summary className="cursor-pointer">
            إضافة وتعديل الحقول المخصصة
          </summary>
          <div className="mt-3">
            <StudentCustomFieldsEditor values={{}} onChange={() => {}} />
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 underline"
            >
              تحديث قائمة الحقول بعد التعديل
            </button>
          </div>
        </details>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">نماذج التسجيل</h2>
        {!forms.length && <p>لا توجد نماذج حتى الآن.</p>}
        {forms.map((f) => (
          <article
            key={f.id}
            className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-xl p-4"
          >
            <div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="text-xs">
                {f.is_active ? 'التسجيل مفتوح' : 'التسجيل مغلق'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <button
                disabled={busy}
                onClick={() => {
                  setEditing(f.id)
                  setTitle(f.title)
                  setDescription(f.description)
                  setPublicIds(f.public_field_ids)
                  setStudentFields(f.student_fields ?? DEFAULT_STUDENT_FIELDS)
                  setRequiredStudentFields(f.required_student_fields ?? [])
                  setActive(f.is_active)
                }}
              >
                تعديل
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await request(`${base}/forms/${f.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ ...f, is_active: !f.is_active }),
                    })
                  })
                }
              >
                {f.is_active ? 'إغلاق التسجيل' : 'فتح التسجيل'}
              </button>
              <button
                onClick={() =>
                  void navigator.clipboard
                    .writeText(`${location.origin}/register/${f.token}`)
                    .then(() => setNotice('تم نسخ الرابط'))
                    .catch(() => setError('تعذر نسخ الرابط'))
                }
              >
                نسخ الرابط
              </button>
              <a
                className="font-bold text-cyan-700"
                href={`/register/${f.token}/print`}
                target="_blank"
                rel="noreferrer"
              >
                QR والملصق
              </a>
              <a href={`/register/${f.token}`} target="_blank" rel="noreferrer">
                معاينة
              </a>
            </div>
          </article>
        ))}
      </section>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">
            طلبات التسجيل {status === 'pending' && `(${requests.length})`}
          </h2>
          <select
            aria-label="حالة الطلبات"
            className="surface-field rounded-xl px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="pending">بانتظار المراجعة</option>
            <option value="approved">مقبولة</option>
            <option value="rejected">مرفوضة</option>
          </select>
        </div>
        {!requests.length && (
          <p className="py-6 text-center text-deep-500">
            لا توجد طلبات بهذه الحالة.
          </p>
        )}
        {requests.map((row) => (
          <article key={row.id} className="glass-card space-y-3 rounded-xl p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-bold">{row.name}</h3>
                <p className="text-sm">
                  {row.phone} •{' '}
                  {new Date(row.created_at).toLocaleDateString('ar-EG')}
                </p>
              </div>
              {row.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    disabled={busy}
                    className="water-btn rounded-lg px-4 py-2"
                    onClick={() => openApproval(row)}
                  >
                    قبول واستكمال البيانات
                  </button>
                  <button
                    disabled={busy}
                    className="water-btn-outline rounded-lg px-4 py-2"
                    onClick={() => {
                      if (confirm(`رفض طلب ${row.name}؟`))
                        void run(async () => {
                          await request(`${base}/requests/${row.id}/reject`, {
                            method: 'POST',
                          })
                          setNotice('تم رفض الطلب')
                        })
                    }}
                  >
                    رفض
                  </button>
                </div>
              )}
            </div>
            {STUDENT_FORM_FIELDS.filter(field => row.student_data?.[field.id] != null).map(field => (
              <p key={field.id} className="text-sm">
                <strong>{field.label}: </strong>
                {studentFieldSummary(row.student_data || {}, field.id, { sheikh_id: sheikhs, category_ids: categories })}
              </p>
            ))}
            {row.fields.map((f) => (
              <p key={f.id} className="text-sm">
                <strong>{f.name}: </strong>
                {row.answers[f.id] === 'true'
                  ? 'نعم'
                  : row.answers[f.id] === 'false'
                  ? 'لا'
                  : row.answers[f.id] || '—'}
              </p>
            ))}
          </article>
        ))}
      </section>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !busy) setSelected(null)
          }}
        >
          <section
            ref={approvalRef}
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return
              const elements = Array.from(
                approvalRef.current?.querySelectorAll<HTMLElement>(
                  'input:not(:disabled), select:not(:disabled), button:not(:disabled), textarea:not(:disabled), a[href]'
                ) || []
              )
              const first = elements[0],
                last = elements[elements.length - 1]
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last?.focus()
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first?.focus()
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 dark:bg-slate-900"
          >
            <h2 id="approval-title" className="mb-4 text-xl font-bold">
              قبول الطالب واستكمال بياناته
            </h2>
            <p className="mb-4 text-sm">
              يُضاف الطالب عند تأكيد القبول بعد حفظ الشيخ والحقول التالية.
            </p>
            {error && (
              <p role="alert" className="mb-4 text-red-600">
                {error}
              </p>
            )}
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void run(async () => {
                  await request(`${base}/requests/${selected.id}/approve`, {
                    method: 'POST',
                    body: JSON.stringify({
                      student: {
                        name,
                        ...approvalStudentData(studentData),
                        custom_field_values: Object.fromEntries(
                          Object.entries(values).filter(([key]) =>
                            fields.some((f) => f.id === Number(key))
                          )
                        ),
                      },
                    }),
                  })
                  setSelected(null)
                  setNotice('تم قبول الطلب وإضافة الطالب')
                })
              }}
            >
              <label className="block">
                اسم الطالب
                <input
                  autoFocus
                  required
                  maxLength={100}
                  className="surface-field rounded-xl px-3 py-2 mt-1 w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <RegistrationStudentFields
                fields={STUDENT_FORM_FIELDS.map(field => field.id)}
                options={{ sheikh_id: sheikhs, category_ids: categories }}
                value={studentData}
                onChange={setStudentData}
              />
              <RegistrationFields
                fields={fields}
                values={values}
                onChange={setValues}
              />
              <div className="flex gap-3">
                <button
                  disabled={busy}
                  className="water-btn rounded-lg px-4 py-2"
                >
                  {busy ? 'جارٍ الحفظ…' : 'تأكيد القبول وإضافة الطالب'}
                </button>
                <button
                  disabled={busy}
                  type="button"
                  className="water-btn-outline rounded-lg px-4 py-2"
                  onClick={() => setSelected(null)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

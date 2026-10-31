'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { PublicRegistration } from '@/lib/student-registration'
import RegistrationFields from '@/components/RegistrationFields'

export default function RegisterStudent() {
  const { token } = useParams<{ token: string }>()
  const [form, setForm] = useState<PublicRegistration | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(false),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    fetch(`/api/student-registration/public/${encodeURIComponent(token)}`, {
      credentials: 'omit',
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('رابط التسجيل مغلق أو غير متاح')
        setForm(await r.json())
      })
      .catch((e) => setError(e.message))
  }, [token])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch(
        `/api/student-registration/public/${encodeURIComponent(token)}`,
        {
          method: 'POST',
          credentials: 'omit',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.get('name'),
            phone: data.get('phone') || null,
            birthday: data.get('birthday') || null,
            website: data.get('website'),
            answers,
          }),
        }
      )
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? 'تم إرسال طلبات كثيرة. يرجى المحاولة لاحقاً.'
            : 'تعذر إرسال الطلب. تحقق من البيانات وحاول مرة أخرى.'
        )
      setSuccess(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="min-h-screen bg-gradient-to-br from-cyan-50 to-emerald-50 px-4 py-12 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-xl rounded-3xl border border-cyan-100 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:p-10">
        <p className="mb-3 text-sm font-bold text-cyan-700">
          {form?.tahfiz_name || 'زمزم • تسجيل الطلاب'}
        </p>
        <h1 className="text-2xl font-bold">
          {form?.title || 'تسجيل طالب جديد'}
        </h1>
        {error && (
          <p role="alert" className="my-4 text-red-600">
            {error}
          </p>
        )}
        {success ? (
          <div role="status" className="mt-8 space-y-3">
            <h2 className="text-xl font-bold text-emerald-700">
              تم استلام طلبك بنجاح
            </h2>
            <p>
              ستراجع إدارة التحفيظ طلبك وتتواصل معك. لا يُضاف الطالب إلا بعد
              موافقة الإدارة.
            </p>
          </div>
        ) : form ? (
          <form onSubmit={submit} className="mt-6 space-y-5">
            <p className="whitespace-pre-wrap text-sm text-slate-500">
              {form.description}
            </p>
            <label className="block space-y-2">
              <span>اسم الطالب *</span>
              <input
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                className="surface-field rounded-xl px-3 py-2 w-full"
              />
            </label>
            <label className="block space-y-2">
              <span>رقم التواصل</span>
              <input
                name="phone"
                autoComplete="tel"
                type="tel"
                maxLength={20}
                className="surface-field rounded-xl px-3 py-2 w-full"
              />
            </label>
            <label className="block space-y-2">
              <span>تاريخ الميلاد</span>
              <input
                name="birthday"
                type="date"
                className="surface-field rounded-xl px-3 py-2 w-full"
              />
            </label>
            <div hidden aria-hidden="true">
              <input name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <RegistrationFields
              fields={form.fields}
              values={answers}
              onChange={setAnswers}
            />
            <p className="text-xs text-slate-500">
              بإرسال الطلب، توافق على مشاركة هذه البيانات مع إدارة التحفيظ لغرض
              التسجيل.
            </p>
            <button
              disabled={busy}
              className="water-btn w-full rounded-xl px-5 py-3"
            >
              {busy ? 'جارٍ الإرسال…' : 'إرسال طلب التسجيل'}
            </button>
          </form>
        ) : (
          !error && (
            <p className="mt-8" role="status">
              جارٍ تحميل نموذج التسجيل…
            </p>
          )
        )}
      </div>
    </main>
  )
}

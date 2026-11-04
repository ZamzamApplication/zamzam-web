'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { PublicRegistration } from '@/lib/student-registration'
import RegistrationFields from '@/components/RegistrationFields'
import OpenInApp from '@/components/OpenInApp'

const steps = [
  ['01', 'املأ بيانات الطالب', 'الاسم ورقم التواصل وبقية الحقول المطلوبة.'],
  ['02', 'تراجع الإدارة الطلب', 'نتحقق من البيانات ونتواصل معكم عند الحاجة.'],
  ['03', 'نرحّب بالطالب', 'يُضاف الطالب إلى الحلقة بعد موافقة الإدارة.'],
]

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
  const tahfizName = form?.tahfiz_name || 'زمزم'
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:flex lg:items-center lg:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-700/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-teal-300/20 blur-3xl dark:bg-teal-700/10"
      />

      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/75 lg:grid-cols-[minmax(280px,.82fr)_minmax(0,1.18fr)]">
        <aside className="relative isolate hidden overflow-hidden bg-gradient-to-br from-cyan-800 via-cyan-700 to-teal-600 p-10 text-white lg:flex lg:flex-col">
          <div
            aria-hidden="true"
            className="absolute -left-20 top-16 -z-10 h-56 w-56 rounded-full border-[42px] border-white/5"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -right-16 -z-10 h-72 w-72 rounded-full bg-white/5"
          />
          <div className="flex items-center gap-3 self-start rounded-2xl bg-white/10 px-3 py-2 backdrop-blur-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl text-blue-700 shadow-lg shadow-cyan-950/15">
              💧
            </span>
            <span>
              <strong className="block text-lg leading-none">زمزم</strong>
              <small className="mt-1 block text-[10px] text-blue-100">
                إدارة التحفيظ ببساطة
              </small>
            </span>
          </div>

          <div className="my-auto">
            <p className="mb-3 text-xs font-bold tracking-wider text-blue-100">
              تسجيل الطلاب · {tahfizName}
            </p>
            <h2 className="max-w-sm text-3xl font-bold leading-[1.45]">
              خطوة أولى نحو رحلة حفظ.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-blue-50/85">
              املأ النموذج، وستراجع إدارة التحفيظ طلبك وتتواصل معك لإكمال
              التسجيل.
            </p>
            <div className="mt-8 grid gap-3">
              {steps.map(([number, label, detail]) => (
                <div
                  key={number}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-sm font-bold">
                    {number}
                  </span>
                  <span>
                    <strong className="block text-sm">{label}</strong>
                    <small className="mt-0.5 block text-[11px] leading-5 text-blue-50/75">
                      {detail}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs leading-5 text-blue-100/70">
            زمزم · رفيق رحلتكم مع القرآن
          </p>
        </aside>

        <section className="flex items-center p-5 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-7 flex items-center justify-between gap-3 lg:hidden">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-deep-800"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-500 text-xl text-white shadow-md">
                  💧
                </span>
                <span className="text-lg font-bold">زمزم</span>
              </Link>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-cyan-100 dark:bg-cyan-950/50 dark:text-blue-200 dark:ring-cyan-900">
                {tahfizName}
              </span>
            </div>

            <OpenInApp kind="register" token={token} />

            {success ? (
              <div role="status" className="py-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
                  ✓
                </span>
                <h1 className="mt-5 text-2xl font-bold text-deep-900">
                  تم استلام طلبك بنجاح
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-deep-500">
                  ستراجع إدارة التحفيظ طلبك وتتواصل معك. لا يُضاف الطالب إلا بعد
                  موافقة الإدارة.
                </p>
                <Link
                  href="/"
                  className="water-btn-outline mt-7 inline-block rounded-xl px-5 py-3 font-semibold"
                >
                  العودة إلى زمزم
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl shadow-sm ring-1 ring-cyan-100 dark:bg-cyan-950/50 dark:ring-cyan-900">
                    📝
                  </span>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    {tahfizName}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-deep-900 sm:text-3xl">
                    {form?.title || 'تسجيل طالب جديد'}
                  </h1>
                  {form?.description && (
                    <p className="mt-3 whitespace-pre-wrap rounded-xl bg-water-50/70 p-3 text-sm leading-6 text-deep-600 dark:bg-slate-800/50 dark:text-deep-500">
                      {form.description}
                    </p>
                  )}
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-5 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                  >
                    {error}
                  </div>
                )}

                {form ? (
                  <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold text-deep-700 sm:col-span-2">
                        اسم الطالب *
                        <input
                          name="name"
                          autoComplete="name"
                          required
                          maxLength={100}
                          placeholder="الاسم الكامل"
                          className="surface-field mt-2 w-full rounded-xl px-4 py-3 font-normal"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-deep-700">
                        رقم التواصل
                        <input
                          name="phone"
                          autoComplete="tel"
                          type="tel"
                          maxLength={20}
                          dir="ltr"
                          inputMode="tel"
                          placeholder="01xxxxxxxxx"
                          className="surface-field mt-2 w-full rounded-xl px-4 py-3 text-right font-normal"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-deep-700">
                        تاريخ الميلاد
                        <input
                          name="birthday"
                          type="date"
                          className="surface-field mt-2 w-full rounded-xl px-4 py-3 font-normal"
                        />
                      </label>
                    </div>
                    <div hidden aria-hidden="true">
                      <input name="website" tabIndex={-1} autoComplete="off" />
                    </div>
                    <RegistrationFields
                      fields={form.fields}
                      values={answers}
                      onChange={setAnswers}
                    />
                    <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-deep-500 dark:bg-slate-800/40">
                      بإرسال الطلب، توافق على مشاركة هذه البيانات مع إدارة
                      التحفيظ لغرض التسجيل.
                    </p>
                    <button
                      disabled={busy}
                      className="water-btn w-full rounded-xl py-3 font-semibold text-white shadow-lg shadow-cyan-600/15 disabled:opacity-50"
                    >
                      {busy ? 'جارٍ الإرسال…' : 'إرسال طلب التسجيل'}
                    </button>
                  </form>
                ) : (
                  !error && (
                    <p
                      className="mt-8 flex items-center gap-3 text-sm text-deep-500"
                      role="status"
                    >
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-water-200 border-t-water-600" />
                      جارٍ تحميل نموذج التسجيل…
                    </p>
                  )
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

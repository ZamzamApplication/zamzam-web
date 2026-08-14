'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import TahfizInitialSettingsFields, { DEFAULT_INITIAL_TAHFIZ_SETTINGS, type TahfizInitialSettings } from '@/components/TahfizInitialSettingsFields'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [modeReady, setModeReady] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [initialSettings, setInitialSettings] = useState<TahfizInitialSettings>(() => ({ ...DEFAULT_INITIAL_TAHFIZ_SETTINGS }))
  const router = useRouter()

  useEffect(() => {
    setInviteToken(new URLSearchParams(window.location.search).get('invite') || '')
    setModeReady(true)
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!inviteToken && step === 1) {
      setStep(2)
      return
    }
    setLoading(true)
    setError('')
    try {
      if (inviteToken) {
        await api.registerWithInvitation(inviteToken, username, password)
        const user = await api.getMe()
        localStorage.setItem('user', JSON.stringify(user))
        if (user.tahfiz_id) localStorage.setItem('active_tahfiz_id', String(user.tahfiz_id))
        if (user.tahfiz?.name) localStorage.setItem('active_tahfiz_name', user.tahfiz.name)
        window.location.assign('/dashboard')
        return
      }
      await api.signup(name, username, password, phone, initialSettings)
      router.push('/login?registered=1')
    } catch (err: any) {
      setError(err.message || 'تعذر إرسال الطلب')
    } finally {
      setLoading(false)
    }
  }

  if (!modeReady) return <div className="page-loading" aria-label="جاري التحميل" />

  const isSetupStep = !inviteToken && step === 2
  const title = inviteToken ? 'انضم إلى فريق التحفيظ' : isSetupStep ? 'جهّز مساحة التحفيظ' : 'ابدأ رحلتك مع زمزم'
  const description = inviteToken
    ? 'أنشئ بيانات دخولك، وسنربط حسابك بالتحفيظ المدعو إليه مباشرة.'
    : isSetupStep
      ? 'اختر الإعدادات الأساسية الآن، ويمكنك تعديلها لاحقًا متى احتجت.'
      : 'أنشئ مساحة منظّمة لإدارة الحلقات والحضور ومتابعة الطلاب من مكان واحد.'

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:flex lg:items-center lg:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-700/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-teal-300/20 blur-3xl dark:bg-teal-700/10" />

      <div className={`relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/75 ${isSetupStep ? 'lg:grid-cols-[minmax(280px,.65fr)_minmax(0,1.35fr)]' : 'lg:grid-cols-[minmax(300px,.9fr)_minmax(0,1.1fr)]'}`}>
        <aside className="relative isolate hidden min-h-[640px] overflow-hidden bg-gradient-to-br from-cyan-800 via-cyan-700 to-teal-600 p-10 text-white lg:block">
          <div aria-hidden="true" className="absolute -left-20 top-16 -z-10 h-56 w-56 rounded-full border-[42px] border-white/5" />
          <div aria-hidden="true" className="absolute -bottom-20 -right-16 -z-10 h-72 w-72 rounded-full bg-white/5" />
          <div className="flex h-full flex-col">
            <Link href="/" className="inline-flex w-fit items-center gap-3 rounded-2xl bg-white/10 px-3 py-2 backdrop-blur-sm hover:bg-white/15">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl text-cyan-700 shadow-lg shadow-cyan-950/15">💧</span>
              <span><strong className="block text-lg leading-none">زمزم</strong><small className="mt-1 block text-[10px] text-cyan-100">إدارة التحفيظ ببساطة</small></span>
            </Link>

            <div className="my-10 lg:my-auto">
              <p className="mb-3 text-xs font-bold tracking-wider text-cyan-100">منظومة واحدة · رؤية أوضح</p>
              <h2 className="max-w-sm text-3xl font-bold leading-[1.45] sm:text-4xl">كل ما تحتاجه الحلقة، في مكان هادئ ومنظّم.</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-cyan-50/85">سجّل الحضور، تابع إنجاز الطلاب، ونظّم عمل الشيوخ من واجهة عربية مصممة للاستخدام اليومي.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  ['✓', 'إعداد سريع', 'ابدأ بخطوتين واضبط التفاصيل لاحقًا'],
                  ['⌁', 'متابعة واضحة', 'الحضور والتقدم والتقارير في سياق واحد'],
                  ['◇', 'فريق متصل', 'أدوار منظمة للمديرين والشيوخ'],
                ].map(([icon, label, detail]) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg font-bold">{icon}</span>
                    <span><strong className="block text-sm">{label}</strong><small className="mt-0.5 block text-[11px] leading-5 text-cyan-50/75">{detail}</small></span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs leading-5 text-cyan-100/70">صُمم زمزم ليبقى بسيطًا مهما نما عدد الطلاب والحلقات.</p>
          </div>
        </aside>

        <section className="flex items-center p-6 sm:p-10 lg:p-12">
          <div className={`mx-auto w-full ${isSetupStep ? 'max-w-3xl' : 'max-w-md'}`}>
            <Link href="/" className="mb-8 inline-flex items-center gap-2 text-deep-800 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-500 text-xl text-white shadow-md">💧</span>
              <span className="text-lg font-bold">زمزم</span>
            </Link>
            {!inviteToken && (
              <div className="mb-8" aria-label={`الخطوة ${step} من 2`}>
                <div className="mb-3 flex items-center justify-between text-xs font-semibold">
                  <span className="text-cyan-700 dark:text-cyan-300">الخطوة {step} من 2</span>
                  <span className="text-deep-400">{step === 1 ? 'بيانات الحساب' : 'إعداد التحفيظ'}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className={`h-full rounded-full bg-gradient-to-l from-cyan-500 to-teal-500 transition-all duration-300 ${step === 1 ? 'w-1/2' : 'w-full'}`} /></div>
              </div>
            )}

            <div className="mb-7">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl shadow-sm ring-1 ring-cyan-100 dark:bg-cyan-950/50 dark:ring-cyan-900">{isSetupStep ? '⚙️' : inviteToken ? '👋' : '🌱'}</span>
              <h1 className="text-2xl font-bold text-deep-900 sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-deep-500">{description}</p>
            </div>

            {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">{error}</div>}
            <form onSubmit={submit} className="space-y-5">
              {!inviteToken && step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-deep-700 sm:col-span-2">اسم التحفيظ
                    <input value={name} onChange={e => setName(e.target.value)} required minLength={2} autoComplete="organization" placeholder="مثال: دار أهل القرآن" className="surface-field mt-2 w-full rounded-xl px-4 py-3 font-normal" />
                  </label>
                  <label className="block text-sm font-semibold text-deep-700 sm:col-span-2">رقم التواصل <span className="font-normal text-deep-400">(اختياري)</span>
                    <input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" inputMode="tel" autoComplete="tel" placeholder="01xxxxxxxxx" className="surface-field mt-2 w-full rounded-xl px-4 py-3 text-right font-normal" />
                  </label>
                </div>
              )}
              {(inviteToken || step === 1) && <label className="block text-sm font-semibold text-deep-700">اسم المستخدم
                <input value={username} onChange={e => setUsername(e.target.value)} required minLength={3} dir="ltr" autoComplete="username" placeholder="username" className="surface-field mt-2 w-full rounded-xl px-4 py-3 text-left font-normal" />
              </label>}
              {(inviteToken || step === 1) && <label className="block text-sm font-semibold text-deep-700">كلمة المرور
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} dir="ltr" autoComplete="new-password" placeholder="8 أحرف على الأقل" className="surface-field mt-2 w-full rounded-xl px-4 py-3 text-left font-normal" />
                <span className="mt-1.5 block text-xs font-normal text-deep-400">استخدم ثمانية أحرف على الأقل لحماية حسابك.</span>
              </label>}
              {isSetupStep && <TahfizInitialSettingsFields value={initialSettings} onChange={setInitialSettings} />}
              <div className="flex gap-3 pt-1">
                {isSetupStep && <button type="button" onClick={() => setStep(1)} disabled={loading} className="water-btn-outline flex-1 rounded-xl py-3 font-semibold disabled:opacity-50">السابق</button>}
                <button disabled={loading} className="water-btn flex-1 rounded-xl py-3 font-semibold text-white shadow-lg shadow-cyan-600/15 disabled:opacity-50">{loading ? 'جاري الإرسال...' : inviteToken ? 'إنشاء الحساب والانضمام' : step === 1 ? 'متابعة الإعداد' : 'إرسال طلب التسجيل'}</button>
              </div>
            </form>
            <p className="mt-6 text-center text-sm text-deep-500">{inviteToken ? 'لديك حساب بالفعل؟' : 'لديك حساب؟'} <Link href={inviteToken ? `/login?next=${encodeURIComponent(`/invite/${inviteToken}`)}` : '/login'} className="font-bold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">تسجيل الدخول</Link></p>
          </div>
        </section>
      </div>
    </main>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import TahfizInitialSettingsFields, { DEFAULT_ATTENDANCE_STATUSES, DEFAULT_SESSION_NAMES, type TahfizInitialSettings } from '@/components/TahfizInitialSettingsFields'

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
  const [initialSettings, setInitialSettings] = useState<TahfizInitialSettings>({
    attendanceStatuses: DEFAULT_ATTENDANCE_STATUSES,
    presentStatus: 'حاضر',
    absentStatus: 'غياب',
    sessionNames: DEFAULT_SESSION_NAMES,
  })
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className={`glass-strong rounded-2xl p-6 sm:p-8 w-full ${!inviteToken && step === 2 ? 'max-w-2xl' : 'max-w-md'}`}>
        <h1 className="text-2xl font-bold text-deep-900 text-center">{inviteToken ? 'إنشاء حساب وقبول الدعوة' : 'تسجيل تحفيظ جديد'}</h1>
        <p className="text-sm text-deep-500 text-center mt-2 mb-4">{inviteToken ? 'أنشئ حسابك وسيتم ربطه بالتحفيظ المدعو إليه مباشرة.' : step === 1 ? 'أدخل البيانات الأساسية أولاً.' : 'اضبط طريقة عمل التحفيظ قبل إرسال الطلب.'}</p>
        {!inviteToken && <div className="mb-6 flex items-center justify-center gap-2" aria-label={`الخطوة ${step} من 2`}><span className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-cyan-600' : 'bg-slate-200'}`} /><span className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-cyan-600' : 'bg-slate-200 dark:bg-slate-700'}`} /></div>}
        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 text-center">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          {!inviteToken && step === 1 && (
            <>
              <label className="block text-sm font-medium text-deep-700">اسم التحفيظ
                <input value={name} onChange={e => setName(e.target.value)} required minLength={2} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
              </label>
              <label className="block text-sm font-medium text-deep-700">رقم التواصل
                <input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
              </label>
            </>
          )}
          {(inviteToken || step === 1) && <label className="block text-sm font-medium text-deep-700">اسم المستخدم
            <input value={username} onChange={e => setUsername(e.target.value)} required minLength={3} dir="ltr" className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
          </label>}
          {(inviteToken || step === 1) && <label className="block text-sm font-medium text-deep-700">كلمة المرور
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} dir="ltr" className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
          </label>}
          {!inviteToken && step === 2 && <TahfizInitialSettingsFields value={initialSettings} onChange={setInitialSettings} />}
          <div className="flex gap-3">
            {!inviteToken && step === 2 && <button type="button" onClick={() => setStep(1)} disabled={loading} className="water-btn-outline flex-1 rounded-xl py-3 font-semibold disabled:opacity-50">السابق</button>}
            <button disabled={loading} className="water-btn flex-1 text-white py-3 rounded-xl font-semibold disabled:opacity-50">{loading ? 'جاري الإرسال...' : inviteToken ? 'إنشاء الحساب والانضمام' : step === 1 ? 'التالي' : 'إرسال طلب التسجيل'}</button>
          </div>
        </form>
        <p className="text-center text-sm mt-5"><Link href={inviteToken ? `/login?next=${encodeURIComponent(`/invite/${inviteToken}`)}` : '/login'} className="text-cyan-700 font-semibold">{inviteToken ? 'لدي حساب بالفعل' : 'العودة لتسجيل الدخول'}</Link></p>
      </div>
    </div>
  )
}

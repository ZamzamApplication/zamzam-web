'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [modeReady, setModeReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setInviteToken(new URLSearchParams(window.location.search).get('invite') || '')
    setModeReady(true)
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (inviteToken) {
        const result = await api.registerWithInvitation(inviteToken, username, password)
        localStorage.setItem('token', result.access_token)
        const user = await api.getMe()
        localStorage.setItem('user', JSON.stringify(user))
        if (user.tahfiz_id) localStorage.setItem('active_tahfiz_id', String(user.tahfiz_id))
        if (user.tahfiz?.name) localStorage.setItem('active_tahfiz_name', user.tahfiz.name)
        window.location.assign('/dashboard')
        return
      }
      await api.signup(name, username, password, phone)
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
      <div className="glass-strong rounded-2xl p-6 sm:p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-deep-900 text-center">{inviteToken ? 'إنشاء حساب وقبول الدعوة' : 'تسجيل تحفيظ جديد'}</h1>
        <p className="text-sm text-deep-500 text-center mt-2 mb-6">{inviteToken ? 'أنشئ حسابك وسيتم ربطه بالتحفيظ المدعو إليه مباشرة.' : 'سيُراجع الطلب قبل تفعيل الحساب.'}</p>
        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 text-center">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          {!inviteToken && (
            <>
              <label className="block text-sm font-medium text-deep-700">اسم التحفيظ
                <input value={name} onChange={e => setName(e.target.value)} required minLength={2} className="mt-1 w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
              </label>
              <label className="block text-sm font-medium text-deep-700">رقم التواصل
                <input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" className="mt-1 w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
              </label>
            </>
          )}
          <label className="block text-sm font-medium text-deep-700">اسم المستخدم
            <input value={username} onChange={e => setUsername(e.target.value)} required minLength={3} dir="ltr" className="mt-1 w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
          </label>
          <label className="block text-sm font-medium text-deep-700">كلمة المرور
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} dir="ltr" className="mt-1 w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
          </label>
          <button disabled={loading} className="w-full water-btn text-white py-3 rounded-xl font-semibold disabled:opacity-50">{loading ? 'جاري الإرسال...' : inviteToken ? 'إنشاء الحساب والانضمام' : 'إرسال طلب التسجيل'}</button>
        </form>
        <p className="text-center text-sm mt-5"><Link href={inviteToken ? `/login?next=${encodeURIComponent(`/invite/${inviteToken}`)}` : '/login'} className="text-cyan-700 font-semibold">{inviteToken ? 'لدي حساب بالفعل' : 'العودة لتسجيل الدخول'}</Link></p>
      </div>
    </div>
  )
}

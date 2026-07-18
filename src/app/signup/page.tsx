'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.signup(name, username, password, phone)
      router.push('/login?registered=1')
    } catch (err: any) {
      setError(err.message || 'تعذر إرسال الطلب')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl p-6 sm:p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-deep-900 text-center">تسجيل تحفيظ جديد</h1>
        <p className="text-sm text-deep-500 text-center mt-2 mb-6">سيُراجع الطلب قبل تفعيل الحساب.</p>
        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 text-center">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-deep-700">اسم التحفيظ
            <input value={name} onChange={e => setName(e.target.value)} required minLength={2} className="mt-1 w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
          </label>
          <label className="block text-sm font-medium text-deep-700">رقم التواصل
            <input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" className="mt-1 w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
          </label>
          <label className="block text-sm font-medium text-deep-700">اسم المستخدم
            <input value={username} onChange={e => setUsername(e.target.value)} required minLength={3} dir="ltr" className="mt-1 w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
          </label>
          <label className="block text-sm font-medium text-deep-700">كلمة المرور
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} dir="ltr" className="mt-1 w-full px-4 py-2.5 bg-white/50 border border-water-300 rounded-xl" />
          </label>
          <button disabled={loading} className="w-full water-btn text-white py-3 rounded-xl font-semibold disabled:opacity-50">{loading ? 'جاري الإرسال...' : 'إرسال طلب التسجيل'}</button>
        </form>
        <p className="text-center text-sm mt-5"><Link href="/login" className="text-cyan-700 font-semibold">العودة لتسجيل الدخول</Link></p>
      </div>
    </div>
  )
}

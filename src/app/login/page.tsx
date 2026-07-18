'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(username, password)
      localStorage.setItem('token', res.access_token)
      const user = await api.getMe()
      localStorage.setItem('user', JSON.stringify(user))
      if (user.role === 'super_admin') router.push('/platform')
      else if (user.tahfiz?.status !== 'active') router.push('/pending')
      else router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="glass-strong rounded-2xl p-6 sm:p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 animate-float inline-block">💧</div>
          <h1 className="text-3xl font-bold text-deep-700">زمزم</h1>
          <p className="text-deep-600/70 mt-1 text-sm">تسجيل الدخول</p>
        </div>

        {error && (
          <div className="bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-4 text-sm text-center border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-deep-700 mb-1">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 focus:border-transparent transition"
              required
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-deep-700 mb-1">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 focus:border-transparent transition"
              required
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full water-btn text-white py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? 'جاري التحميل...' : 'دخول'}
          </button>
        </form>
        <p className="text-center text-sm text-deep-600 mt-5">
          ليس لديك حساب؟ <a href="/signup" className="font-semibold text-cyan-700">سجّل تحفيظك</a>
        </p>
      </div>
    </div>
  )
}

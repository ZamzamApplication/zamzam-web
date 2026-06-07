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
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="glass-strong rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 animate-float inline-block">💧</div>
          <h1 className="text-3xl font-bold text-deep-700 font-arabic">زمزم</h1>
          <p className="text-deep-600/70 mt-1 text-sm">تسجيل الدخول</p>
        </div>

        {error && (
          <div className="bg-red-50/80 backdrop-blur-sm text-red-700 px-4 py-3 rounded-xl mb-4 text-sm text-center border border-red-200">
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
              className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 focus:border-transparent transition"
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
              className="w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400 focus:border-transparent transition"
              required
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full water-btn text-white py-2.5 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? 'جاري التحميل...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}

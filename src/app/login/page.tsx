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
    <div className="min-h-screen flex items-center justify-center bg-aqua-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-aqua-100">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-aqua-700">📖 حلقة القرآن</h1>
          <p className="text-gray-500 mt-1">تسجيل الدخول</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-aqua-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-400 focus:border-transparent"
              required
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-aqua-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-400 focus:border-transparent"
              required
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-aqua-600 text-white py-2 rounded-lg hover:bg-aqua-700 transition disabled:opacity-50 font-medium"
          >
            {loading ? 'جاري التحميل...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}

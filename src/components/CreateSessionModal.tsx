'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

function todayLocalDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CreateSessionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (sessionId: number) => void
}) {
  const [sessionDate, setSessionDate] = useState(todayLocalDate)
  const [defaultStatus, setDefaultStatus] = useState('غياب')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionDate) return
    setError('')
    setLoading(true)
    try {
      const res = await api.createSession(sessionDate, undefined, defaultStatus)
      onCreated(res.id)
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء الجلسة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="mobile-sheet glass-strong rounded-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-deep-800 mb-4">إضافة جلسة جديدة</h2>

        {error && (
          <div className="bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm text-red-700 dark:text-red-300 px-4 py-2 rounded-xl mb-4 text-sm text-center border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-deep-700 mb-1">التاريخ</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-deep-700 mb-1">الحالة الافتراضية</label>
            <select
              value={defaultStatus}
              onChange={(e) => setDefaultStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
            >
              <option value="غياب">غياب</option>
              <option value="حاضر">حاضر</option>
              <option value="غياب بعذر">غياب بعذر</option>
              <option value="لا ينطبق">لا ينطبق</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 water-btn-outline rounded-xl text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 water-btn text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'جاري...' : 'إضافة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

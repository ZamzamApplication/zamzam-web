'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Circle } from '@/lib/types'

export default function CreateSessionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (sessionId: number) => void
}) {
  const [circles, setCircles] = useState<Circle[]>([])
  const [circleId, setCircleId] = useState<number | ''>('')
  const [sessionDate, setSessionDate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getCircles().then(setCircles).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!circleId || !sessionDate) return
    setError('')
    setLoading(true)
    try {
      const res = await api.createSession(circleId as number, sessionDate)
      onCreated(res.id)
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء الجلسة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 border border-aqua-100">
        <h2 className="text-xl font-bold text-aqua-800 mb-4">إضافة جلسة جديدة</h2>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحلقة</label>
            <select
              value={circleId}
              onChange={(e) => setCircleId(Number(e.target.value))}
              className="w-full px-4 py-2 border border-aqua-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-400 bg-white"
              required
            >
              <option value="">اختر الحلقة</option>
              {circles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-4 py-2 border border-aqua-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aqua-400"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-aqua-300 text-aqua-700 rounded-lg hover:bg-aqua-50 transition text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-aqua-600 text-white rounded-lg hover:bg-aqua-700 transition text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'جاري...' : 'إضافة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

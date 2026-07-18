'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

const labels = {
  pending: 'طلبك قيد المراجعة',
  rejected: 'لم تتم الموافقة على الطلب',
  suspended: 'تم إيقاف التحفيظ مؤقتاً',
  active: 'تم تفعيل التحفيظ',
}

export default function PendingPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    api.getMe().then((data: User) => {
      setUser(data)
      if (data.tahfiz?.status === 'active') router.replace('/dashboard')
    }).catch(() => router.replace('/login'))
  }, [router])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="glass-card rounded-2xl p-8 max-w-lg w-full text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-deep-900">{user?.tahfiz ? labels[user.tahfiz.status] : 'جاري التحميل...'}</h1>
        <p className="mt-3 text-deep-600">{user?.tahfiz?.name}</p>
        {user?.tahfiz?.status_reason && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-amber-800">{user.tahfiz.status_reason}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => window.location.reload()} className="water-btn text-white px-5 py-2.5 rounded-xl">تحديث الحالة</button>
          <button onClick={logout} className="water-btn-outline px-5 py-2.5 rounded-xl">تسجيل الخروج</button>
        </div>
      </div>
    </div>
  )
}

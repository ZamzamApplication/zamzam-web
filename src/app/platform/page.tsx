'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

type PlatformTahfiz = {
  id: number
  name: string
  contact_phone?: string | null
  status: 'pending' | 'active' | 'rejected' | 'suspended'
  status_reason?: string | null
  owner_username?: string | null
  created_at: string
}

export default function PlatformPage() {
  const [items, setItems] = useState<PlatformTahfiz[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const load = useCallback(() => api.getPlatformTahfiz().then(setItems).finally(() => setLoading(false)), [])
  useEffect(() => { load().catch(() => router.replace('/dashboard')) }, [load, router])

  async function act(item: PlatformTahfiz, action: 'approve' | 'reject' | 'suspend' | 'reactivate') {
    const needsReason = action === 'reject' || action === 'suspend'
    const reason = needsReason ? window.prompt('اكتب السبب') : ''
    if (needsReason && !reason) return
    await api.platformTahfizAction(item.id, action, reason || undefined)
    await load()
  }

  async function support(item: PlatformTahfiz) {
    await api.enterSupportWorkspace(item.id)
    localStorage.setItem('support_tahfiz_id', String(item.id))
    localStorage.setItem('support_tahfiz_name', item.name)
    router.push('/dashboard')
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-deep-900">إدارة منصة زمزم</h1><p className="text-sm text-deep-500 mt-1">طلبات التحفيظ ومساحات الدعم</p></div>
        <button onClick={() => { localStorage.removeItem('support_tahfiz_id'); load() }} className="water-btn-outline px-4 py-2 rounded-xl">تحديث</button>
      </div>
      {loading ? <div className="page-loading" /> : (
        <div className="grid gap-4">
          {items.map(item => (
            <article key={item.id} className="glass-card rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg text-deep-900">{item.name}</h2>
                <p className="text-sm text-deep-500 mt-1">{item.owner_username} {item.contact_phone ? `• ${item.contact_phone}` : ''}</p>
                <span className="inline-block mt-2 rounded-lg bg-water-100 px-2.5 py-1 text-xs text-deep-700">{item.status}</span>
                {item.status_reason && <p className="text-sm text-amber-700 mt-2">{item.status_reason}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {item.status === 'pending' && <><button onClick={() => act(item, 'approve')} className="water-btn text-white px-3 py-2 rounded-lg">موافقة</button><button onClick={() => act(item, 'reject')} className="px-3 py-2 rounded-lg bg-red-100 text-red-700">رفض</button></>}
                {item.status === 'active' && <><button onClick={() => support(item)} className="water-btn-outline px-3 py-2 rounded-lg">دخول للدعم</button><button onClick={() => act(item, 'suspend')} className="px-3 py-2 rounded-lg bg-amber-100 text-amber-800">إيقاف</button></>}
                {(item.status === 'rejected' || item.status === 'suspended') && <button onClick={() => act(item, 'reactivate')} className="water-btn text-white px-3 py-2 rounded-lg">إعادة التفعيل</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

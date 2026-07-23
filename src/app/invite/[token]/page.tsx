'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { TahfizInvitation } from '@/lib/types'
import AsyncState from '@/components/AsyncState'

const STATUS_LABELS: Record<TahfizInvitation['status'], string> = {
  active: 'صالحة للاستخدام',
  used: 'تم استخدام الدعوة',
  revoked: 'تم إلغاء الدعوة',
  expired: 'انتهت صلاحية الدعوة',
}

export default function InvitationPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token
  const [invitation, setInvitation] = useState<TahfizInvitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    if (!token) return
    setSignedIn(Boolean(localStorage.getItem('token')))
    api.getInvitationPreview(token)
      .then(setInvitation)
      .catch((err: any) => setError(err.message || 'تعذر تحميل الدعوة'))
      .finally(() => setLoading(false))
  }, [token])

  const accept = async () => {
    setAccepting(true)
    setError('')
    try {
      const result = await api.acceptInvitation(token)
      localStorage.setItem('active_tahfiz_id', String(result.tahfiz_id))
      localStorage.removeItem('active_tahfiz_name')
      window.location.assign('/dashboard')
    } catch (err: any) {
      setError(err.message || 'تعذر قبول الدعوة')
      setAccepting(false)
    }
  }

  if (loading) return <div className="page-loading" aria-label="جاري تحميل الدعوة" />
  if (!invitation) return <AsyncState message={error || 'الدعوة غير موجودة'} onRetry={() => router.refresh()} />

  const canAccept = invitation.available && invitation.status === 'active'

  return (
    <div className="mx-auto max-w-xl py-8">
      <section className="glass-strong rounded-2xl p-6 text-center md:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-100 text-2xl dark:bg-cyan-900/40">✉</div>
        <p className="mt-5 text-sm font-semibold text-cyan-700 dark:text-cyan-300">دعوة للانضمام إلى تحفيظ</p>
        <h1 className="mt-2 text-2xl font-bold text-deep-900">{invitation.tahfiz_name}</h1>
        <div className="mt-5 grid gap-3 rounded-xl bg-water-50/70 p-4 text-sm dark:bg-slate-800/50">
          <p>الصلاحية: <b>{invitation.role === 'admin' ? 'مدير' : 'مستخدم / شيخ'}</b></p>
          {invitation.sheikh_name && <p>الشيخ المرتبط: <b>{invitation.sheikh_name}</b></p>}
          <p>حالة الرابط: <b>{STATUS_LABELS[invitation.status]}</b></p>
          <p className="text-xs text-deep-500">تنتهي الصلاحية: {new Date(invitation.expires_at).toLocaleString('ar-EG')}</p>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/25 dark:text-red-200">{error}</div>}

        {signedIn ? (
          <button onClick={accept} disabled={!canAccept || accepting} className="water-btn mt-5 w-full rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-50">
            {accepting ? 'جاري الانضمام...' : canAccept ? 'قبول الدعوة والانضمام' : STATUS_LABELS[invitation.status]}
          </button>
        ) : canAccept ? (
          <div className="mt-5 space-y-3">
            <Link href={`/signup?invite=${encodeURIComponent(token)}`} className="water-btn block w-full rounded-xl px-5 py-3 font-semibold text-white">
              إنشاء حساب جديد والانضمام
            </Link>
            <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="water-btn-outline block w-full rounded-xl px-5 py-3 font-semibold">
              لدي حساب — تسجيل الدخول
            </Link>
            <p className="text-xs text-deep-500">سيتم ربط حسابك بهذا التحفيظ فقط بعد قبول الدعوة.</p>
          </div>
        ) : (
          <button disabled className="water-btn mt-5 w-full rounded-xl px-5 py-3 font-semibold text-white opacity-50">
            {STATUS_LABELS[invitation.status]}
          </button>
        )}
      </section>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { request } from '@/lib/api'

export default function RegistrationNotifications({
  tenantId,
}: {
  tenantId?: number | null
}) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let alive = true
    setCount(0)
    const load = () =>
      request<{ pending_count: number }>('/student-registration/notifications')
        .then((result) => {
          if (alive) setCount(result.pending_count)
        })
        .catch(() => {})
    void load()
    const timer = setInterval(load, 30000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [tenantId])
  if (!count) return null
  return (
    <span
      role="status"
      aria-label={`${count} طلبات تسجيل بانتظار المراجعة`}
      className="mr-2 rounded-full bg-amber-100 px-2 text-xs font-bold text-amber-900"
    >
      {count}
    </span>
  )
}

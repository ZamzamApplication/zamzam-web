'use client'
import Link from 'next/link'
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
        .then((r) => {
          if (alive) setCount(r.pending_count)
        })
        .catch(() => {})
    void load()
    const timer = setInterval(load, 30000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [tenantId])
  return (
    <Link
      href="/registration"
      className="nav-link"
      aria-label={`طلبات التسجيل، ${count} بانتظار المراجعة`}
    >
      طلبات التسجيل
      {count > 0 && (
        <span
          role="status"
          className="mr-2 rounded-full bg-amber-100 px-2 text-xs font-bold text-amber-900"
        >
          {count}
        </span>
      )}
    </Link>
  )
}

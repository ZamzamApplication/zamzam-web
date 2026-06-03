'use client'

import './globals.css'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token && pathname !== '/login') {
      router.push('/login')
      return
    }
    if (token && pathname === '/login') {
      router.push('/')
      return
    }
    if (token) {
      api.getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('token')
          router.push('/login')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [pathname])

  if (pathname === '/login') {
    return (
      <html lang="ar" dir="rtl">
        <body>{children}</body>
      </html>
    )
  }

  return (
    <html lang="ar" dir="rtl">
      <body>
        {!loading && user && (
          <nav className="bg-aqua-700 text-white px-6 py-3 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xl font-bold">📖 حلقة القرآن</Link>
              <Link href="/sessions" className="hover:text-aqua-200 transition">الحضور</Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-aqua-200 text-sm">{user.username}</span>
              <button
                onClick={() => { localStorage.removeItem('token'); router.push('/login') }}
                className="bg-aqua-800 hover:bg-aqua-900 px-3 py-1 rounded text-sm transition"
              >
                تسجيل الخروج
              </button>
            </div>
          </nav>
        )}
        <main className="max-w-5xl mx-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aqua-600" />
            </div>
          ) : (
            children
          )}
        </main>
      </body>
    </html>
  )
}

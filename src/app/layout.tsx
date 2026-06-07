'use client'

import './globals.css'
import { Cairo } from 'next/font/google'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

const cairoFont = Cairo({ subsets: ['arabic'], display: 'swap', variable: '--font-cairo' })

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
        <head>
          <title>دار زمزم</title>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        </head>
        <body className={`${cairoFont.variable} wave-bg font-cairo`}>{children}</body>
      </html>
    )
  }

  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>دار زمزم</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${cairoFont.variable} wave-bg font-cairo`}>
        {!loading && user && (
          <nav className="nav-glass text-white px-6 py-3 flex justify-between items-center sticky top-0 z-40">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xl font-bold tracking-wide">
                <span className="text-water-200">💧</span> دار زمزم
              </Link>
              <Link href="/sessions" className="text-white/80 hover:text-white transition">الجلسات</Link>
              <Link href="/attendance" className="text-white/80 hover:text-white transition">سجل الحضور</Link>
              <Link href="/manage" className="text-white/80 hover:text-white transition">الإدارة</Link>
              <Link href="/reports" className="text-white/80 hover:text-white transition">التقارير</Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/60 text-sm">{user.username}</span>
              <button
                onClick={() => { localStorage.removeItem('token'); router.push('/login') }}
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm transition border border-white/10"
              >
                تسجيل الخروج
              </button>
            </div>
          </nav>
        )}
        <main className="max-w-5xl mx-auto p-6 relative z-10">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-droplet rounded-full h-8 w-8 bg-water-400" />
            </div>
          ) : (
            children
          )}
        </main>
      </body>
    </html>
  )
}

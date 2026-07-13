'use client'

import './globals.css'
import { Cairo } from 'next/font/google'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'
import PwaRegistration from '@/components/PwaRegistration'

const cairoFont = Cairo({ subsets: ['arabic'], display: 'swap', variable: '--font-cairo' })

function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      setDark(true)
    }
  }, [])

  const toggle = useCallback(() => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }, [dark])

  return (
    <button
      onClick={toggle}
      className="nav-icon-btn"
      title={dark ? 'الوضع النهاري' : 'الوضع الليلي'}
    >
      {dark ? (
        <svg className="w-5 h-5 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const isLoginPage = pathname === '/login'
  const isLandingPage = pathname === '/'
  const navLinkClass = (href: string) => `nav-link ${pathname === href ? 'nav-link-active' : ''}`

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token && !isLoginPage && !isLandingPage) {
      router.push('/login')
      return
    }
    if (token && isLoginPage) {
      router.push('/dashboard')
      return
    }
    if (token) {
      api.getMe()
        .then((u) => {
          setUser(u)
          localStorage.setItem('user', JSON.stringify(u))
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          if (!isLandingPage) router.push('/login')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [pathname])

  if (isLoginPage) {
    return (
      <html lang="ar" dir="rtl" suppressHydrationWarning>
        <head>
          <title>دار زمزم</title>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <meta name="theme-color" content="#0891b2" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="دار زمزم" />
        </head>
        <body className={`${cairoFont.variable} font-cairo`}><PwaRegistration />{children}</body>
      </html>
    )
  }

  if (isLandingPage) {
    return (
      <html lang="ar" dir="rtl" suppressHydrationWarning>
        <head>
          <title>دار زمزم لتحفيظ القرآن</title>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <meta name="theme-color" content="#0891b2" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="دار زمزم" />
        </head>
        <body className={`${cairoFont.variable} font-cairo`}>
          <PwaRegistration />
          <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-white drop-shadow-lg">
              💧 دار زمزم
            </Link>
          </header>
          <main>{children}</main>
        </body>
      </html>
    )
  }

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <title>دار زمزم</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#0891b2" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="دار زمزم" />
      </head>
      <body className={`${cairoFont.variable} font-cairo`}>
        <PwaRegistration />
        {!loading && user && (
          <nav className="nav-glass px-4 md:px-6 py-3 sticky top-0 z-40">
            <div className="max-w-6xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <Link href="/dashboard" className="nav-brand">
                <span className="nav-brand-mark">💧</span> دار زمزم
              </Link>
              <Link href="/sessions" className={navLinkClass('/sessions')}>الجلسات</Link>
              <Link href="/attendance" className={navLinkClass('/attendance')}>سجل الحضور</Link>
              {user?.role === 'admin' && <Link href="/manage" className={navLinkClass('/manage')}>الإدارة</Link>}
              <Link href="/reports" className={navLinkClass('/reports')}>التقارير</Link>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />
              <span className="nav-username">{user.username}</span>
              <button
                onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/login') }}
                className="nav-action"
              >
                تسجيل الخروج
              </button>
            </div>
            </div>
          </nav>
        )}
        <main className="max-w-6xl mx-auto p-4 md:p-6 relative z-10">
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

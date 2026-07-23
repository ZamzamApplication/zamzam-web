'use client'

import './globals.css'
import { Cairo } from 'next/font/google'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'
import PwaRegistration from '@/components/PwaRegistration'

const cairoFont = Cairo({ subsets: ['arabic'], display: 'swap', variable: '--font-cairo' })

type NavIconName = 'home' | 'sessions' | 'attendance' | 'reports' | 'manage' | 'settings'

function NavIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9.5 20v-6h5v6" /></>,
    sessions: <><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3v5M16 3v5M4 10h16M8 14h3M8 17h7" /></>,
    attendance: <><path d="M9 5H6a2 2 0 0 0-2 2v12h13v-3" /><path d="M9 3h6v4H9zM9 12l2.2 2.2L20 6" /></>,
    reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    manage: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M17 8h4M19 6v4M17 15h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.09A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3v-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.51V3h4v.09A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.4.32.75.6 1 .3.25.68.39 1.09.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

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
      aria-label={dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
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

function TahfizSwitcher({ user, onSwitch }: { user: User; onSwitch: (tahfizId: number) => void }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const memberships = user.memberships || []
  const current = memberships.find(membership => membership.tahfiz_id === user.tahfiz_id)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (memberships.length <= 1 || !current) return null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`group flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5 text-right transition sm:px-2.5 ${
          open
            ? 'border-cyan-400 bg-cyan-50 shadow-md shadow-cyan-900/10 dark:border-cyan-600 dark:bg-cyan-950/70'
            : 'border-water-200/80 bg-white/55 hover:border-cyan-300 hover:bg-white/80 dark:border-slate-700 dark:bg-slate-900/45 dark:hover:border-cyan-700'
        }`}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 text-sm text-white shadow-sm">
          {current.tahfiz_name.trim().charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="hidden text-[10px] font-semibold leading-none text-deep-400 sm:block">التحفيظ الحالي</span>
          <span className="block max-w-24 truncate text-xs font-bold text-deep-800 sm:mt-1 sm:max-w-40 sm:text-sm">{current.tahfiz_name}</span>
        </span>
        <svg className={`h-4 w-4 shrink-0 text-deep-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute end-0 top-full z-[70] mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-water-200 bg-white/95 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
          <div className="px-3 pb-2 pt-1">
            <p className="text-sm font-bold text-deep-900">التبديل بين التحفيظات</p>
            <p className="mt-0.5 text-[11px] text-deep-500">ستتغير البيانات والجلسات حسب التحفيظ المختار</p>
          </div>
          <div className="space-y-1" role="none">
            {memberships.map(membership => {
              const isCurrent = membership.tahfiz_id === user.tahfiz_id
              const isAvailable = membership.tahfiz_status === 'active'
              return (
                <button
                  key={membership.id}
                  type="button"
                  role="menuitem"
                  disabled={!isAvailable}
                  onClick={() => {
                    setOpen(false)
                    onSwitch(membership.tahfiz_id)
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    isCurrent
                      ? 'bg-cyan-50 ring-1 ring-inset ring-cyan-200 dark:bg-cyan-950/50 dark:ring-cyan-800'
                      : 'hover:bg-water-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                    isCurrent ? 'bg-cyan-600 text-white' : 'bg-water-100 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300'
                  }`}>
                    {membership.tahfiz_name.trim().charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-deep-900">{membership.tahfiz_name}</span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        membership.role === 'admin'
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                      }`}>
                        {membership.role === 'admin' ? 'مدير' : 'شيخ'}
                      </span>
                      {!isAvailable && <span className="text-[10px] text-red-500">غير نشط</span>}
                    </span>
                  </span>
                  {isCurrent && (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-600 text-xs font-bold text-white" aria-label="التحفيظ الحالي">✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [supportName, setSupportName] = useState('')
  const verifiedToken = useRef<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const isLoginPage = pathname === '/login'
  const isSignupPage = pathname === '/signup'
  const isInvitePage = pathname.startsWith('/invite/')
  const isPendingPage = pathname === '/pending'
  const isPublicAuthPage = isLoginPage || isSignupPage || isInvitePage
  const isLandingPage = pathname === '/'
  const isDedicatedPlatform = pathname === '/platform'
  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
  const navLinkClass = (href: string) => `nav-link ${isActive(href) ? 'nav-link-active' : ''}`
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('active_tahfiz_id')
    localStorage.removeItem('active_tahfiz_name')
    localStorage.removeItem('support_tahfiz_id')
    localStorage.removeItem('support_tahfiz_name')
    router.push('/login')
  }

  const switchTahfiz = (tahfizId: number) => {
    const membership = user?.memberships?.find(item => item.tahfiz_id === tahfizId)
    if (!membership || membership.tahfiz_status !== 'active' || tahfizId === user?.tahfiz_id) return
    localStorage.setItem('active_tahfiz_id', String(tahfizId))
    localStorage.setItem('active_tahfiz_name', membership.tahfiz_name)
    localStorage.removeItem('support_tahfiz_id')
    localStorage.removeItem('support_tahfiz_name')
    window.location.assign('/dashboard')
  }

  const mobileNavItems: { href: string; label: string; icon: NavIconName; adminOnly?: boolean }[] = [
    { href: '/dashboard', label: 'الرئيسية', icon: 'home' },
    { href: '/sessions', label: 'الجلسات', icon: 'sessions' },
    { href: '/attendance', label: 'الحضور', icon: 'attendance' },
    { href: '/reports', label: 'التقارير', icon: 'reports' },
    { href: '/manage', label: 'الإدارة', icon: 'manage', adminOnly: true },
    { href: '/settings', label: 'الإعدادات', icon: 'settings', adminOnly: true },
  ]

  useEffect(() => {
    setSupportName(localStorage.getItem('support_tahfiz_name') || '')
    const token = localStorage.getItem('token')
    if (!token && !isPublicAuthPage && !isLandingPage) {
      setUser(null)
      setLoading(false)
      const nextPath = pathname.startsWith('/invite/') ? `?next=${encodeURIComponent(pathname)}` : ''
      router.push(`/login${nextPath}`)
      return
    }
    if (token) {
      if (verifiedToken.current === token) {
        setLoading(false)
        return
      }
      setLoading(true)
      api.getMe()
        .then((u) => {
          verifiedToken.current = token
          setUser(u)
          localStorage.setItem('user', JSON.stringify(u))
          if (u.role !== 'super_admin' && u.tahfiz_id) {
            localStorage.setItem('active_tahfiz_id', String(u.tahfiz_id))
            if (u.tahfiz?.name) localStorage.setItem('active_tahfiz_name', u.tahfiz.name)
          }
          if (u.role === 'super_admin') {
            if (!localStorage.getItem('support_tahfiz_id') && pathname !== '/platform') router.replace('/platform')
          } else if (u.tahfiz?.status !== 'active' && pathname !== '/pending') {
            router.replace('/pending')
          } else if (u.tahfiz?.status === 'active' && (isLoginPage || isPendingPage)) {
            router.replace('/dashboard')
          }
        })
        .catch(() => {
          verifiedToken.current = null
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          if (!isLandingPage) router.push('/login')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [pathname, router, isPublicAuthPage, isLandingPage, isLoginPage, isPendingPage])

  if (isPublicAuthPage) {
    return (
      <html lang="ar" dir="rtl" suppressHydrationWarning>
        <head>
          <title>زمزم</title>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <meta name="theme-color" content="#0891b2" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="زمزم" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </head>
        <body className={`${cairoFont.variable} font-cairo`}><PwaRegistration />{children}</body>
      </html>
    )
  }

  if (isPendingPage) {
    return (
      <html lang="ar" dir="rtl" suppressHydrationWarning>
        <head><title>حالة طلب التحفيظ — زمزم</title><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
        <body className={`${cairoFont.variable} font-cairo`}><PwaRegistration />{children}</body>
      </html>
    )
  }

  if (isLandingPage) {
    return (
      <html lang="ar" dir="rtl" suppressHydrationWarning>
        <head>
          <title>زمزم لتحفيظ القرآن</title>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <meta name="theme-color" content="#0891b2" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="زمزم" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </head>
        <body className={`${cairoFont.variable} font-cairo`}>
          <PwaRegistration />
          <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-white drop-shadow-lg">
              💧 زمزم
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
        <title>زمزم</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#0891b2" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="زمزم" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${cairoFont.variable} font-cairo`}>
        <PwaRegistration />
        {!loading && user && (
          <>
          <header className="mobile-topbar nav-glass md:hidden sticky top-0 z-40">
            <Link href={isDedicatedPlatform ? '/platform' : '/dashboard'} className="nav-brand" aria-label="الصفحة الرئيسية">
              <span className="nav-brand-mark">💧</span> زمزم
            </Link>
            <div className="flex items-center gap-2">
              <TahfizSwitcher user={user} onSwitch={switchTahfiz} />
              {(!user.memberships || user.memberships.length <= 1) && <span className="mobile-user-badge" title={user.username}>{user.username.charAt(0).toUpperCase()}</span>}
              <ThemeToggle />
              <button onClick={logout} className="nav-icon-btn" title="تسجيل الخروج" aria-label="تسجيل الخروج">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
                </svg>
              </button>
            </div>
          </header>
          <nav className="nav-glass hidden md:block px-6 py-3 sticky top-0 z-40" aria-label="التنقل الرئيسي">
            <div className="max-w-6xl mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <Link href={isDedicatedPlatform ? '/platform' : '/dashboard'} className="nav-brand">
                <span className="nav-brand-mark">💧</span> زمزم
              </Link>
              {user?.role === 'super_admin' && isDedicatedPlatform ? (
                <span className="nav-link nav-link-active">إدارة المنصة</span>
              ) : (
                <>
                  <Link href="/sessions" className={navLinkClass('/sessions')} aria-current={isActive('/sessions') ? 'page' : undefined}>الجلسات</Link>
                  <Link href="/attendance" className={navLinkClass('/attendance')} aria-current={isActive('/attendance') ? 'page' : undefined}>سجل الحضور</Link>
                  {(user?.role === 'admin' || user?.role === 'super_admin') && <Link href="/manage" className={navLinkClass('/manage')} aria-current={isActive('/manage') ? 'page' : undefined}>الإدارة</Link>}
                  {(user?.role === 'admin' || user?.role === 'super_admin') && <Link href="/settings" className={navLinkClass('/settings')} aria-current={isActive('/settings') ? 'page' : undefined}>إعدادات التحفيظ</Link>}
                  <Link href="/reports" className={navLinkClass('/reports')} aria-current={isActive('/reports') ? 'page' : undefined}>التقارير</Link>
                  {user?.role === 'super_admin' && <Link href="/platform" className={navLinkClass('/platform')} aria-current={isActive('/platform') ? 'page' : undefined}>المنصة</Link>}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <TahfizSwitcher user={user} onSwitch={switchTahfiz} />
              <ThemeToggle />
              <span className="nav-username">{user.username}</span>
              <button
                onClick={logout}
                className="nav-action"
              >
                تسجيل الخروج
              </button>
            </div>
            </div>
          </nav>
          {!isDedicatedPlatform && <nav className="mobile-bottom-nav md:hidden" aria-label="التنقل الرئيسي">
            {mobileNavItems.filter((item) => !item.adminOnly || user.role === 'admin' || user.role === 'super_admin').map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-item ${isActive(item.href) ? 'mobile-nav-item-active' : ''}`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>}
          </>
        )}
        {!loading && user?.role === 'super_admin' && supportName && !isDedicatedPlatform && (
          <div className="bg-amber-100 text-amber-900 text-center text-sm py-2 px-4">
            وضع الدعم: {supportName}
            <button onClick={() => { localStorage.removeItem('support_tahfiz_id'); localStorage.removeItem('support_tahfiz_name'); setSupportName(''); router.push('/platform') }} className="font-bold underline mr-3">إنهاء الدعم</button>
          </div>
        )}
        <main className="app-main max-w-6xl mx-auto p-3 sm:p-4 md:p-6 relative z-10">
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

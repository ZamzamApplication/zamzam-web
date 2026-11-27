'use client'

import './globals.css'
import { Cairo } from 'next/font/google'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'
import { CurrentUserContext } from '@/lib/current-user'
import { toast } from '@/lib/ui-feedback'
import FeedbackButton from '@/components/FeedbackButton'
import FeedbackHost from '@/components/FeedbackHost'
import PwaRegistration from '@/components/PwaRegistration'
import TahfizSwitcher from '@/components/TahfizSwitcher'
import Icon from '@/components/Icon'
import { BrandMark, DesktopNavLinks, MobileBottomNav, SESSION_SECTION_TABS, SectionTabs, ThemeToggle } from '@/components/AppNavigation'
import TahfizInitialSettingsFields, { DEFAULT_INITIAL_TAHFIZ_SETTINGS, type TahfizInitialSettings } from '@/components/TahfizInitialSettingsFields'

const cairoFont = Cairo({ subsets: ['arabic'], display: 'swap', variable: '--font-cairo' })

/** Applies the saved theme before first paint so dark mode never flashes light. */
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`

const PAGE_TITLES: [prefix: string, title: string][] = [
  ['/dashboard', 'الرئيسية'],
  ['/sessions/', 'تسجيل الحضور'],
  ['/sessions', 'الحلقات'],
  ['/attendance', 'سجل الحضور'],
  ['/reports', 'التقارير'],
  ['/competitions', 'المسابقات'],
  ['/trips', 'الرحلات'],
  ['/finance', 'القسم المالي'],
  ['/subscriptions', 'الاشتراكات'],
  ['/manage', 'الإدارة'],
  ['/settings', 'الإعدادات'],
  ['/audit-log', 'سجل التدقيق'],
  ['/students/', 'ملف الطالب'],
  ['/registration', 'التسجيل'],
  ['/plan', 'خطة الحفظ'],
  ['/platform', 'إدارة المنصة'],
  ['/login', 'تسجيل الدخول'],
  ['/signup', 'إنشاء حساب'],
  ['/invite/', 'دعوة'],
  ['/register/', 'تسجيل طالب'],
  ['/pending', 'حالة طلب التحفيظ'],
]

function pageTitle(pathname: string) {
  const match = PAGE_TITLES.find(([prefix]) => pathname === prefix || (prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname.startsWith(`${prefix}/`)))
  return match ? `${match[1]} — زمزم` : 'زمزم'
}

function SharedHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <head>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <title>{title}</title>
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      <meta name="theme-color" content="#0891b2" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="زمزم" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      {children}
    </head>
  )
}

/** Placeholder shown only while the signed-in user is first loaded. */
function AppSkeleton() {
  return (
    <div role="status" aria-label="جاري التحميل">
      <div className="nav-glass sticky top-0 z-40 h-[3.75rem]" />
      <div className="mx-auto max-w-6xl p-3 sm:p-4 md:p-6"><div className="page-loading" /></div>
    </div>
  )
}

function clearSessionStorage() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('active_tahfiz_id')
  localStorage.removeItem('active_tahfiz_name')
  localStorage.removeItem('support_tahfiz_id')
  localStorage.removeItem('support_tahfiz_name')
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supportName, setSupportName] = useState('')
  const [switchingTahfizId, setSwitchingTahfizId] = useState<number | null>(null)
  const [showCreateTahfiz, setShowCreateTahfiz] = useState(false)
  const [newTahfizName, setNewTahfizName] = useState('')
  const [newTahfizPhone, setNewTahfizPhone] = useState('')
  const [newTahfizStep, setNewTahfizStep] = useState<1 | 2>(1)
  const [newTahfizSettings, setNewTahfizSettings] = useState<TahfizInitialSettings>(() => ({ ...DEFAULT_INITIAL_TAHFIZ_SETTINGS }))
  const [creatingTahfiz, setCreatingTahfiz] = useState(false)
  const [createTahfizError, setCreateTahfizError] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const lastValidatedPath = useRef<string | null>(null)

  const isLoginPage = pathname === '/login'
  const isSignupPage = pathname === '/signup'
  const isInvitePage = pathname.startsWith('/invite/')
  const isPlanPage = pathname === '/plan'
  const isPendingPage = pathname === '/pending'
  const isLeaderboardPage = pathname.startsWith('/leaderboard/')
  const isPublicAuthPage = isLoginPage || isSignupPage || isInvitePage || isPlanPage || pathname.startsWith('/register/') || isLeaderboardPage
  const isLandingPage = pathname === '/'
  const isDedicatedPlatform = pathname === '/platform'
  const isSessionDetail = pathname.startsWith('/sessions/')
  const needsUser = !isPublicAuthPage && !isLandingPage
  const title = pageTitle(pathname)
  const homeHref = isDedicatedPlatform ? '/platform' : user?.role === 'auditor' ? '/finance' : '/dashboard'

  const logout = async () => {
    try {
      await api.logout()
    } catch {
      // Clear local presentation state even if the session already expired.
    }
    clearSessionStorage()
    setUser(null)
    lastValidatedPath.current = null
    router.push('/login')
  }

  const switchTahfiz = async (tahfizId: number) => {
    const membership = user?.memberships?.find(item => item.tahfiz_id === tahfizId)
    if (!membership || membership.tahfiz_status !== 'active' || tahfizId === user?.tahfiz_id) return
    setSwitchingTahfizId(tahfizId)
    try {
      await api.setDefaultTahfiz(tahfizId)
      localStorage.setItem('active_tahfiz_id', String(tahfizId))
      localStorage.setItem('active_tahfiz_name', membership.tahfiz_name)
      localStorage.removeItem('support_tahfiz_id')
      localStorage.removeItem('support_tahfiz_name')
      if (pathname.startsWith('/sessions/')) {
        window.location.assign('/sessions')
      } else {
        window.location.reload()
      }
    } catch (error: any) {
      toast(error.message || 'تعذر تبديل التحفيظ', { tone: 'error' })
      setSwitchingTahfizId(null)
    }
  }

  const createTahfiz = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newTahfizName.trim().length < 2) return
    if (newTahfizStep === 1) {
      setNewTahfizStep(2)
      return
    }
    setCreatingTahfiz(true)
    setCreateTahfizError('')
    try {
      await api.createTahfiz(newTahfizName.trim(), newTahfizPhone, newTahfizSettings)
      const refreshed = await api.getMe()
      setUser(refreshed)
      localStorage.setItem('user', JSON.stringify(refreshed))
      setShowCreateTahfiz(false)
      setNewTahfizName('')
      setNewTahfizPhone('')
      setNewTahfizStep(1)
      setNewTahfizSettings({ ...DEFAULT_INITIAL_TAHFIZ_SETTINGS })
      toast('تم إرسال طلب التحفيظ الجديد للمراجعة. سيظهر للتبديل بعد اعتماده.', { tone: 'success', duration: 8000 })
    } catch (error: any) {
      setCreateTahfizError(error.message || 'تعذر إنشاء التحفيظ')
    } finally {
      setCreatingTahfiz(false)
    }
  }

  const openCreateTahfiz = () => {
    setCreateTahfizError('')
    setNewTahfizStep(1)
    setShowCreateTahfiz(true)
  }

  // Load the user once for the signed-in area, then revalidate quietly on each
  // navigation so an expired session still returns to the login page without
  // blanking the navigation and page while the request runs.
  useEffect(() => {
    setSupportName(localStorage.getItem('support_tahfiz_name') || '')
    if (!needsUser || lastValidatedPath.current === pathname) return
    lastValidatedPath.current = pathname
    let alive = true
    api.getMe()
      .then((u) => {
        if (!alive) return
        setUser(u)
        localStorage.setItem('user', JSON.stringify(u))
        if (u.role !== 'super_admin' && u.tahfiz_id) {
          localStorage.setItem('active_tahfiz_id', String(u.tahfiz_id))
          if (u.tahfiz?.name) localStorage.setItem('active_tahfiz_name', u.tahfiz.name)
        }
      })
      .catch(() => {
        if (!alive) return
        setUser(null)
        lastValidatedPath.current = null
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        const nextPath = pathname.startsWith('/invite/') ? `?next=${encodeURIComponent(pathname)}` : ''
        router.push(`/login${nextPath}`)
      })
    return () => { alive = false }
  }, [pathname, router, needsUser])

  // Role and tahfiz-status routing, applied on every navigation from the cached user.
  useEffect(() => {
    if (!user || !needsUser) return
    if (user.role === 'super_admin') {
      if (!localStorage.getItem('support_tahfiz_id') && pathname !== '/platform') router.replace('/platform')
    } else if (user.tahfiz?.status !== 'active' && pathname !== '/pending') {
      router.replace('/pending')
    } else if (user.tahfiz?.status === 'active' && isPendingPage) {
      router.replace(user.role === 'auditor' ? '/finance' : '/dashboard')
    } else if (user.role === 'auditor' && pathname !== '/finance') {
      router.replace('/finance')
    }
  }, [user, pathname, router, needsUser, isPendingPage])

  if (isPublicAuthPage || isLandingPage || isPendingPage) {
    return (
      <html lang="ar" dir="rtl" suppressHydrationWarning>
        <SharedHead title={isLandingPage ? 'زمزم — رفيق رحلتكم مع القرآن' : title}>
          {isLandingPage && <meta name="description" content="مساحة عربية لإدارة حلقات تحفيظ القرآن. نظّم الحلقات والطلاب، سجّل الحضور، وتابع خطط الحفظ والمراجعة والتقارير مع زمزم." />}
          {/* Leaderboards list children's names: shareable by link, never indexed. */}
          {isLeaderboardPage && <meta name="robots" content="noindex, nofollow" />}
        </SharedHead>
        <body className={`${cairoFont.variable} font-cairo`}>
          <PwaRegistration />
          <FeedbackHost />
          {children}
        </body>
      </html>
    )
  }

  const showSectionTabs = user?.role !== 'auditor' && SESSION_SECTION_TABS.some(item => item.href === pathname)

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <SharedHead title={title} />
      <body className={`${cairoFont.variable} font-cairo`}>
        <PwaRegistration />
        <FeedbackHost />
        {!user ? <AppSkeleton /> : (
          <CurrentUserContext.Provider value={user}>
            <header className="mobile-topbar nav-glass md:hidden sticky top-0 z-40">
              <Link href={homeHref} className="nav-brand" aria-label="الصفحة الرئيسية">
                <BrandMark /> زمزم
              </Link>
              <div className="flex items-center gap-2">
                {user.role !== 'auditor' && <TahfizSwitcher user={user} onSwitch={switchTahfiz} onCreate={openCreateTahfiz} switchingId={switchingTahfizId} />}
                <ThemeToggle />
                {user.role === 'auditor' || isDedicatedPlatform ? (
                  <button type="button" onClick={logout} className="nav-icon-btn" title="تسجيل الخروج" aria-label="تسجيل الخروج">
                    <Icon name="logout" />
                  </button>
                ) : null}
              </div>
            </header>
            <nav className="nav-glass hidden md:block px-6 py-3 sticky top-0 z-40" aria-label="التنقل الرئيسي">
              <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
                  <Link href={homeHref} className="nav-brand">
                    <BrandMark /> زمزم
                  </Link>
                  {user.role === 'super_admin' && isDedicatedPlatform ? (
                    <span className="nav-link nav-link-active">إدارة المنصة</span>
                  ) : (
                    <DesktopNavLinks user={user} pathname={pathname} />
                  )}
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  {user.role !== 'auditor' && <TahfizSwitcher user={user} onSwitch={switchTahfiz} onCreate={openCreateTahfiz} switchingId={switchingTahfizId} />}
                  <ThemeToggle />
                  <span className="nav-username hidden lg:inline">{user.username}</span>
                  <button type="button" onClick={logout} className="nav-icon-btn" title="تسجيل الخروج" aria-label="تسجيل الخروج">
                    <Icon name="logout" />
                  </button>
                </div>
              </div>
            </nav>
            {!isDedicatedPlatform && <MobileBottomNav user={user} pathname={pathname} onLogout={logout} />}
            {switchingTahfizId && (
              <div role="status" className="border-b border-cyan-200/70 bg-cyan-50/85 px-4 py-1.5 text-center text-xs font-semibold text-blue-900 dark:border-cyan-900 dark:bg-cyan-950/70 dark:text-blue-100">
                جاري التبديل إلى {user.memberships?.find(item => item.tahfiz_id === switchingTahfizId)?.tahfiz_name || 'التحفيظ'}…
              </div>
            )}
            {user.role === 'super_admin' && supportName && !isDedicatedPlatform && (
              <div className="bg-amber-100 text-amber-900 text-center text-sm py-2 px-4">
                وضع الدعم: {supportName}
                <button type="button" onClick={() => { localStorage.removeItem('support_tahfiz_id'); localStorage.removeItem('support_tahfiz_name'); setSupportName(''); router.push('/platform') }} className="font-bold underline mr-3">إنهاء الدعم</button>
              </div>
            )}
            {showCreateTahfiz && (
              <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-tahfiz-title" onClick={() => !creatingTahfiz && setShowCreateTahfiz(false)}>
                <form onSubmit={createTahfiz} className={`glass-strong max-h-[90vh] w-full overflow-y-auto rounded-2xl p-6 ${newTahfizStep === 2 ? 'max-w-2xl' : 'max-w-md'}`} onClick={(event) => event.stopPropagation()}>
                  <h2 id="create-tahfiz-title" className="text-xl font-bold text-deep-900">إنشاء تحفيظ جديد</h2>
                  <p className="mt-2 text-sm text-deep-500">{newTahfizStep === 1 ? 'أدخل البيانات الأساسية. سيُربط التحفيظ بحسابك بصلاحية مدير.' : 'اضبط الحالات وأسماء الحلقات قبل إرسال الطلب.'}</p>
                  <div className="mt-4 flex gap-2" aria-label={`الخطوة ${newTahfizStep} من 2`}><span className="h-1.5 flex-1 rounded-full bg-cyan-600" /><span className={`h-1.5 flex-1 rounded-full ${newTahfizStep === 2 ? 'bg-cyan-600' : 'bg-slate-200 dark:bg-slate-700'}`} /></div>
                  {newTahfizStep === 1 && <>
                  <label className="mt-4 grid gap-1 text-sm font-semibold text-deep-700">
                    اسم التحفيظ
                    <input autoFocus required minLength={2} maxLength={100} value={newTahfizName} onChange={(event) => setNewTahfizName(event.target.value)} className="surface-field rounded-xl px-3 py-2.5" />
                  </label>
                  <label className="mt-3 grid gap-1 text-sm font-semibold text-deep-700">
                    رقم التواصل <span className="text-xs font-normal text-deep-400">(اختياري)</span>
                    <input type="tel" maxLength={20} value={newTahfizPhone} onChange={(event) => setNewTahfizPhone(event.target.value)} className="surface-field rounded-xl px-3 py-2.5" />
                  </label>
                  </>}
                  {newTahfizStep === 2 && <div className="mt-4"><TahfizInitialSettingsFields value={newTahfizSettings} onChange={setNewTahfizSettings} /></div>}
                  {createTahfizError && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{createTahfizError}</p>}
                  <div className="mt-5 flex gap-3">
                    <button type="button" disabled={creatingTahfiz} onClick={() => newTahfizStep === 2 ? setNewTahfizStep(1) : setShowCreateTahfiz(false)} className="water-btn-outline flex-1 rounded-xl px-4 py-2 disabled:opacity-50">{newTahfizStep === 2 ? 'السابق' : 'إلغاء'}</button>
                    <button type="submit" disabled={creatingTahfiz || newTahfizName.trim().length < 2} className="water-btn flex-1 rounded-xl px-4 py-2 font-bold text-white disabled:opacity-50">{creatingTahfiz ? 'جاري الإنشاء…' : newTahfizStep === 1 ? 'التالي' : 'إرسال للمراجعة'}</button>
                  </div>
                </form>
              </div>
            )}
            <main className="app-main max-w-6xl mx-auto p-3 sm:p-4 md:p-6 relative z-10">
              {showSectionTabs && <SectionTabs items={SESSION_SECTION_TABS} pathname={pathname} />}
              {children}
            </main>
            {user.role !== 'super_admin' && user.role !== 'auditor' && !isSessionDetail && <FeedbackButton />}
          </CurrentUserContext.Provider>
        )}
      </body>
    </html>
  )
}

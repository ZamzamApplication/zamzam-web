'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { User } from '@/lib/types'
import Icon, { type IconName } from '@/components/Icon'
import RegistrationNotifications from '@/components/RegistrationNotifications'

export interface NavItem {
  href: string
  label: string
  icon: IconName
  /** Extra path prefixes that count as this item being active. */
  matches?: string[]
  badge?: boolean
}

/** Pages grouped under "الحلقات": shown as sub-tabs on each of them. */
export const SESSION_SECTION_TABS: NavItem[] = [
  { href: '/sessions', label: 'الحلقات', icon: 'sessions' },
  { href: '/attendance', label: 'سجل الحضور', icon: 'attendance' },
  { href: '/reports', label: 'التقارير', icon: 'reports' },
]

export function isPathActive(pathname: string, item: Pick<NavItem, 'href' | 'matches'>) {
  return [item.href, ...(item.matches || [])].some(href => (
    pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
  ))
}

function isAdmin(user: User) {
  return user.role === 'admin' || user.role === 'super_admin'
}

/** Every destination the user's role can reach, in nav order. */
export function navItemsFor(user: User): NavItem[] {
  if (user.role === 'auditor') return [{ href: '/finance', label: 'القسم المالي', icon: 'finance' }]
  const items: NavItem[] = [
    { href: '/dashboard', label: 'الرئيسية', icon: 'home' },
    { href: '/sessions', label: 'الحلقات', icon: 'sessions', matches: ['/attendance', '/reports'] },
    { href: '/competitions', label: 'المسابقات', icon: 'competitions' },
  ]
  if (isAdmin(user)) {
    items.push(
      { href: '/trips', label: 'الرحلات', icon: 'trips' },
      { href: '/finance', label: 'القسم المالي', icon: 'finance', matches: ['/subscriptions'] },
      { href: '/manage', label: 'الإدارة', icon: 'manage', badge: true },
      { href: '/settings', label: 'الإعدادات', icon: 'settings' },
    )
  }
  if (user.role === 'super_admin') items.push({ href: '/platform', label: 'المنصة', icon: 'settings' })
  return items
}

/** Mobile splits destinations into a short bottom bar and a "More" sheet. */
function mobileNavFor(user: User): { primary: NavItem[]; more: NavItem[] } {
  if (user.role === 'auditor') return { primary: navItemsFor(user), more: [] }
  const home: NavItem = { href: '/dashboard', label: 'الرئيسية', icon: 'home' }
  const sessions: NavItem = { href: '/sessions', label: 'الحلقات', icon: 'sessions' }
  const competitions: NavItem = { href: '/competitions', label: 'المسابقات', icon: 'competitions' }
  const more: NavItem[] = [
    { href: '/attendance', label: 'سجل الحضور', icon: 'attendance' },
    { href: '/reports', label: 'التقارير', icon: 'reports' },
  ]
  if (!isAdmin(user)) return { primary: [home, sessions, competitions], more }
  more.push(
    { href: '/trips', label: 'الرحلات', icon: 'trips' },
    { href: '/finance', label: 'القسم المالي', icon: 'finance', matches: ['/subscriptions'] },
    { href: '/settings', label: 'الإعدادات', icon: 'settings' },
    { href: '/audit-log', label: 'سجل التدقيق', icon: 'audit' },
  )
  if (user.role === 'super_admin') more.push({ href: '/platform', label: 'المنصة', icon: 'settings' })
  return { primary: [home, sessions, competitions, { href: '/manage', label: 'الإدارة', icon: 'manage', badge: true }], more }
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark')
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      className="nav-icon-btn"
      title={dark ? 'الوضع النهاري' : 'الوضع الليلي'}
      aria-label={dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
    >
      {dark ? (
        <svg className="w-5 h-5 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

export function BrandMark() {
  return <span className="nav-brand-mark" aria-hidden="true"><Icon name="drop" className="h-5 w-5" strokeWidth={2} /></span>
}

export function DesktopNavLinks({ user, pathname }: { user: User; pathname: string }) {
  return (
    <>
      {navItemsFor(user).map(item => {
        const active = isPathActive(pathname, item)
        return (
          <Link key={item.href} href={item.href} className={`nav-link ${active ? 'nav-link-active' : ''}`} aria-current={active ? 'page' : undefined}>
            {item.label}
            {item.badge && <RegistrationNotifications tenantId={user.tahfiz_id} />}
          </Link>
        )
      })}
    </>
  )
}

export function MobileBottomNav({ user, pathname, onLogout }: { user: User; pathname: string; onLogout: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { primary, more } = mobileNavFor(user)
  const moreActive = more.some(item => isPathActive(pathname, item))

  useEffect(() => setMoreOpen(false), [pathname])

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [moreOpen])

  return (
    <>
      <nav className="mobile-bottom-nav md:hidden" aria-label="التنقل الرئيسي">
        {primary.map(item => {
          const active = isPathActive(pathname, { href: item.href, matches: item.href === '/sessions' ? [] : item.matches })
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${active ? 'mobile-nav-item-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}{item.badge && <RegistrationNotifications tenantId={user.tahfiz_id} />}</span>
            </Link>
          )
        })}
        {more.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`mobile-nav-item ${moreActive ? 'mobile-nav-item-active' : ''}`}
          >
            <Icon name="more" />
            <span>المزيد</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[60] flex items-end bg-slate-950/40 backdrop-blur-sm md:hidden" role="presentation" onClick={() => setMoreOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="المزيد من الصفحات"
            className="glass-strong w-full !rounded-b-none !rounded-t-3xl !bg-[rgb(var(--glass-strong-bg))] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-deep-200" aria-hidden="true" />
            <div className="grid grid-cols-3 gap-2">
              {more.map(item => {
                const active = isPathActive(pathname, item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center text-xs font-bold ${
                      active ? 'border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-200' : 'border-water-200/70 text-deep-700 hover:bg-water-50'
                    }`}
                  >
                    <Icon name={item.icon} className="h-6 w-6" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
            <button type="button" onClick={onLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-900 dark:text-red-300">
              <Icon name="logout" className="h-5 w-5" /> تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/** Sub-tabs shared by the sessions, attendance-log and reports pages. */
export function SectionTabs({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav aria-label="أقسام الحلقات" className="mobile-scroll-tabs mb-5 flex gap-1 border-b border-water-200/60">
      {items.map(item => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              active ? 'border-cyan-500 text-blue-700 dark:text-blue-300' : 'border-transparent text-deep-500 hover:text-deep-800'
            }`}
          >
            <Icon name={item.icon} className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

type TahfizStatus = 'pending' | 'active' | 'rejected' | 'suspended'
type PlatformAction = 'reject' | 'suspend'

type PlatformTahfiz = {
  id: number
  name: string
  contact_phone?: string | null
  status: TahfizStatus
  status_reason?: string | null
  owner_username?: string | null
  created_at: string
  approved_at?: string | null
}

type PlatformMembership = {
  id: number
  tahfiz_id: number
  tahfiz_name: string
  tahfiz_status: TahfizStatus
  role: 'admin' | 'sheikh'
  sheikh_id: number | null
  is_active: boolean
}

type PlatformUser = {
  id: number
  username: string
  is_active: boolean
  default_tahfiz_id: number | null
  memberships: PlatformMembership[]
}

const STATUS_META: Record<TahfizStatus, { label: string; className: string }> = {
  pending: { label: 'قيد المراجعة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-200' },
  active: { label: 'نشط', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200' },
  rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-700 dark:bg-red-900/35 dark:text-red-200' },
  suspended: { label: 'موقوف', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default function PlatformPage() {
  const [items, setItems] = useState<PlatformTahfiz[]>([])
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [membershipTahfizId, setMembershipTahfizId] = useState('')
  const [accessBusy, setAccessBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TahfizStatus>('all')
  const [error, setError] = useState('')
  const [actionDialog, setActionDialog] = useState<{ item: PlatformTahfiz; action: PlatformAction } | null>(null)
  const [reason, setReason] = useState('')
  const router = useRouter()

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const [nextItems, nextUsers] = await Promise.all([
        api.getPlatformTahfiz(),
        api.getPlatformUsers(),
      ])
      setItems(nextItems)
      setPlatformUsers(nextUsers)
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل حسابات التحفيظ')
      throw err
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    localStorage.removeItem('support_tahfiz_id')
    localStorage.removeItem('support_tahfiz_name')
    load().catch(() => router.replace('/dashboard'))
  }, [load, router])

  const counts = useMemo(() => ({
    all: items.length,
    active: items.filter(item => item.status === 'active').length,
    pending: items.filter(item => item.status === 'pending').length,
    attention: items.filter(item => item.status === 'rejected' || item.status === 'suspended').length,
  }), [items])

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ar')
    return items.filter(item => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesQuery = !normalizedQuery || [
        item.name,
        item.owner_username || '',
        item.contact_phone || '',
      ].some(value => value.toLocaleLowerCase('ar').includes(normalizedQuery))
      return matchesStatus && matchesQuery
    })
  }, [items, query, statusFilter])

  const selectedUser = useMemo(
    () => platformUsers.find(user => user.id === Number(selectedUserId)) || null,
    [platformUsers, selectedUserId],
  )

  async function grantMembership() {
    if (!selectedUser || !membershipTahfizId) return
    setAccessBusy(true)
    setError('')
    try {
      await api.grantPlatformMembership(selectedUser.id, Number(membershipTahfizId), 'admin')
      await load(true)
    } catch (err: any) {
      setError(err.message || 'تعذر منح صلاحية التحفيظ')
    } finally {
      setAccessBusy(false)
    }
  }

  async function revokeMembership(membership: PlatformMembership) {
    if (!selectedUser || !window.confirm(`إلغاء وصول ${selectedUser.username} إلى ${membership.tahfiz_name}؟`)) return
    setAccessBusy(true)
    setError('')
    try {
      await api.revokePlatformMembership(selectedUser.id, membership.tahfiz_id)
      await load(true)
    } catch (err: any) {
      setError(err.message || 'تعذر إلغاء الصلاحية')
    } finally {
      setAccessBusy(false)
    }
  }

  async function runAction(item: PlatformTahfiz, action: 'approve' | 'reactivate', actionReason?: string) {
    setBusyId(item.id)
    setError('')
    try {
      await api.platformTahfizAction(item.id, action, actionReason)
      await load(true)
    } catch (err: any) {
      setError(err.message || 'تعذر تنفيذ الإجراء')
    } finally {
      setBusyId(null)
    }
  }

  async function submitReasonAction() {
    if (!actionDialog || !reason.trim()) return
    const { item, action } = actionDialog
    setBusyId(item.id)
    setError('')
    try {
      await api.platformTahfizAction(item.id, action, reason.trim())
      setActionDialog(null)
      setReason('')
      await load(true)
    } catch (err: any) {
      setError(err.message || 'تعذر تنفيذ الإجراء')
    } finally {
      setBusyId(null)
    }
  }

  async function support(item: PlatformTahfiz) {
    setBusyId(item.id)
    setError('')
    try {
      await api.enterSupportWorkspace(item.id)
      localStorage.setItem('support_tahfiz_id', String(item.id))
      localStorage.setItem('support_tahfiz_name', item.name)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'تعذر فتح مساحة الدعم')
      setBusyId(null)
    }
  }

  async function exportFullDatabase() {
    setExporting(true)
    setError('')
    try {
      const blob = await api.exportFullDb()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'zamzam_full_backup.db'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || 'فشل تصدير قاعدة البيانات الكاملة')
    } finally {
      setExporting(false)
    }
  }

  const filterOptions: { key: 'all' | TahfizStatus; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: counts.all },
    { key: 'pending', label: 'قيد المراجعة', count: counts.pending },
    { key: 'active', label: 'نشط', count: counts.active },
    { key: 'suspended', label: 'موقوف', count: items.filter(item => item.status === 'suspended').length },
    { key: 'rejected', label: 'مرفوض', count: items.filter(item => item.status === 'rejected').length },
  ]

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl p-5 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-cyan-100/80 px-3 py-1 text-xs font-bold text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
              إدارة النظام
            </span>
            <h1 className="mt-3 text-2xl md:text-3xl font-bold text-deep-900">لوحة منصة زمزم</h1>
            <p className="mt-2 text-sm text-deep-500">راجع طلبات التسجيل، تابع الحسابات، وادخل لمساحات الدعم عند الحاجة.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="water-btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {refreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
            </button>
            <button
              onClick={exportFullDatabase}
              disabled={exporting}
              className="water-btn rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {exporting ? 'جاري تجهيز النسخة...' : 'تنزيل قاعدة البيانات كاملة'}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/25 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الحسابات', value: counts.all, color: 'bg-cyan-500' },
          { label: 'الحسابات النشطة', value: counts.active, color: 'bg-emerald-500' },
          { label: 'بانتظار المراجعة', value: counts.pending, color: 'bg-amber-500' },
          { label: 'تحتاج متابعة', value: counts.attention, color: 'bg-red-500' },
        ].map(card => (
          <div key={card.label} className="glass-card rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-deep-500">{card.label}</p>
                <p className="mt-1 text-3xl font-bold text-deep-900">{card.value}</p>
              </div>
              <span className={`h-10 w-2.5 rounded-full ${card.color}`} />
            </div>
          </div>
        ))}
      </section>

      <section className="glass-card rounded-2xl p-4 md:p-5">
        <div>
          <h2 className="font-bold text-deep-900">وصول المستخدم لعدة تحفيظات</h2>
          <p className="mt-1 text-xs text-deep-500">اربط حساباً واحداً بتحفيظات محددة. لا يمنح هذا صلاحية إدارة المنصة.</p>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-semibold text-deep-700">
            المستخدم
            <select
              value={selectedUserId}
              onChange={event => setSelectedUserId(event.target.value)}
              className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="">اختر المستخدم</option>
              {platformUsers.map(user => <option key={user.id} value={user.id}>{user.username}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-deep-700">
            التحفيظ
            <select
              value={membershipTahfizId}
              onChange={event => setMembershipTahfizId(event.target.value)}
              className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="">اختر التحفيظ</option>
              {items.filter(item => item.status === 'active').map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button
            onClick={grantMembership}
            disabled={!selectedUser || !membershipTahfizId || accessBusy}
            className="water-btn self-end rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {accessBusy ? 'جاري الحفظ...' : 'منح صلاحية مدير'}
          </button>
        </div>
        {selectedUser && (
          <div className="mt-4 border-t border-water-200/70 pt-4">
            <p className="text-sm font-semibold text-deep-700">صلاحيات {selectedUser.username}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedUser.memberships.filter(membership => membership.is_active).length === 0 ? (
                <span className="text-sm text-deep-500">لا توجد صلاحيات نشطة</span>
              ) : selectedUser.memberships.filter(membership => membership.is_active).map(membership => (
                <span key={membership.id} className="inline-flex items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-sm text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-100">
                  <span>{membership.tahfiz_name} · {membership.role === 'admin' ? 'مدير' : 'شيخ'}</span>
                  <button
                    onClick={() => revokeMembership(membership)}
                    disabled={accessBusy}
                    className="font-bold text-red-600 disabled:opacity-50"
                    aria-label={`إلغاء الوصول إلى ${membership.tahfiz_name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="glass-card rounded-2xl p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="font-bold text-deep-900">حسابات التحفيظ</h2>
            <p className="mt-1 text-xs text-deep-500">عرض {visibleItems.length} من {items.length}</p>
          </div>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="بحث بالاسم، المستخدم أو الهاتف..."
            className="surface-field w-full lg:w-80 rounded-xl px-4 py-2.5 text-sm"
          />
        </div>
        <div className="mobile-scroll-tabs mt-4 flex gap-2 overflow-x-auto pb-1">
          {filterOptions.map(option => (
            <button
              key={option.key}
              onClick={() => setStatusFilter(option.key)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                statusFilter === option.key ? 'water-btn text-white' : 'water-btn-outline'
              }`}
            >
              {option.label} <span className="mr-1 opacity-75">{option.count}</span>
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="page-loading" />
      ) : visibleItems.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <div className="text-4xl">🔎</div>
          <h2 className="mt-3 font-bold text-deep-800">لا توجد نتائج مطابقة</h2>
          <p className="mt-1 text-sm text-deep-500">غيّر البحث أو حالة الحساب.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleItems.map(item => {
            const status = STATUS_META[item.status]
            const busy = busyId === item.id
            return (
              <article key={item.id} className="glass-card rounded-2xl p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-deep-900">{item.name}</h2>
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
                      <span className="rounded-lg bg-water-100/60 px-2 py-1 text-xs text-deep-500">#{item.id}</span>
                    </div>
                    <div className="mt-3 grid gap-1.5 text-sm text-deep-500 sm:grid-cols-2">
                      <p>المستخدم: <span className="font-semibold text-deep-700">{item.owner_username || 'غير محدد'}</span></p>
                      <p>التواصل: <span className="font-semibold text-deep-700" dir="ltr">{item.contact_phone || 'غير محدد'}</span></p>
                      <p>تاريخ الطلب: <span className="font-semibold text-deep-700">{formatDate(item.created_at)}</span></p>
                      {item.approved_at && <p>تاريخ التفعيل: <span className="font-semibold text-deep-700">{formatDate(item.approved_at)}</span></p>}
                    </div>
                    {item.status_reason && (
                      <p className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/25 dark:text-amber-200">
                        السبب: {item.status_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {item.status === 'pending' && (
                      <>
                        <button disabled={busy} onClick={() => runAction(item, 'approve')} className="water-btn rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">موافقة وتفعيل</button>
                        <button disabled={busy} onClick={() => { setActionDialog({ item, action: 'reject' }); setReason('') }} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300">رفض</button>
                      </>
                    )}
                    {item.status === 'active' && (
                      <>
                        <button disabled={busy} onClick={() => support(item)} className="water-btn-outline rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'جاري الدخول...' : 'دخول للدعم'}</button>
                        <button disabled={busy} onClick={() => { setActionDialog({ item, action: 'suspend' }); setReason('') }} className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-200">إيقاف الحساب</button>
                      </>
                    )}
                    {(item.status === 'rejected' || item.status === 'suspended') && (
                      <button disabled={busy} onClick={() => runAction(item, 'reactivate')} className="water-btn rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">إعادة التفعيل</button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {actionDialog && (
        <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" onClick={() => setActionDialog(null)}>
          <div className="mobile-sheet glass-strong w-full max-w-md rounded-2xl p-6" onClick={event => event.stopPropagation()}>
            <h2 className="text-xl font-bold text-deep-900">
              {actionDialog.action === 'reject' ? 'رفض طلب التحفيظ' : 'إيقاف حساب التحفيظ'}
            </h2>
            <p className="mt-2 text-sm text-deep-500">{actionDialog.item.name}</p>
            <label className="mt-5 block text-sm font-semibold text-deep-700">
              السبب
              <textarea
                value={reason}
                onChange={event => setReason(event.target.value)}
                rows={4}
                autoFocus
                placeholder="اكتب سبباً واضحاً يظهر لمدير التحفيظ..."
                className="surface-field mt-2 w-full resize-none rounded-xl px-4 py-3 text-sm"
              />
            </label>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setActionDialog(null)} className="water-btn-outline flex-1 rounded-xl px-4 py-2.5 text-sm">إلغاء</button>
              <button
                onClick={submitReasonAction}
                disabled={!reason.trim() || busyId === actionDialog.item.id}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busyId === actionDialog.item.id ? 'جاري الحفظ...' : 'تأكيد الإجراء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

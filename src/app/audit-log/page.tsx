'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import AsyncState from '@/components/AsyncState'
import { api } from '@/lib/api'
import { auditActionLabel, formatAuditDetails } from '@/lib/audit-log'
import type { AuditLogPage } from '@/lib/types'

const EMPTY_PAGE: AuditLogPage = {
  items: [], total: 0, page: 1, page_size: 50, pages: 1, actions: [], actors: [],
}

export default function AuditLogPageView() {
  const router = useRouter()
  const [result, setResult] = useState<AuditLogPage>(EMPTY_PAGE)
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('')
  const [actorUserId, setActorUserId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const role = JSON.parse(localStorage.getItem('user') || '{}').role
      if (role !== 'admin' && role !== 'super_admin') router.replace('/dashboard')
    } catch {
      router.replace('/dashboard')
    }
  }, [router])

  const load = useCallback(async (page = 1, initial = false) => {
    initial ? setLoading(true) : setBusy(true)
    setError('')
    try {
      setResult(await api.getAuditLogs({
        page,
        pageSize: 50,
        action,
        actorUserId: actorUserId ? Number(actorUserId) : undefined,
        dateFrom,
        dateTo,
        query: query.trim(),
      }))
    } catch (reason: any) {
      setError(reason.message || 'تعذر تحميل سجل التدقيق')
    } finally {
      setLoading(false)
      setBusy(false)
    }
  }, [action, actorUserId, dateFrom, dateTo, query])

  useEffect(() => { void load(1, true) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resetFilters = () => {
    setQuery('')
    setAction('')
    setActorUserId('')
    setDateFrom('')
    setDateTo('')
  }

  if (loading) return <div className="page-loading" aria-label="جاري تحميل سجل التدقيق" />

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3 px-1">
      <div><Link href="/manage" className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">الإدارة ‹</Link><h1 className="mt-1 text-2xl font-bold text-deep-900">سجل التدقيق</h1><p className="mt-1 text-sm text-deep-500">سجل للعمليات الإدارية داخل هذا التحفيظ فقط.</p></div>
      <span className="rounded-full bg-water-100 px-3 py-1.5 text-sm font-bold text-deep-700">{result.total} عملية</span>
    </header>

    <form onSubmit={event => { event.preventDefault(); void load(1) }} className="glass-card rounded-2xl p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-semibold text-deep-700">بحث<input value={query} onChange={event => setQuery(event.target.value)} placeholder="العملية أو التفاصيل أو المستخدم" className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" /></label>
        <label className="text-sm font-semibold text-deep-700">نوع العملية<select value={action} onChange={event => setAction(event.target.value)} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal"><option value="">كل العمليات</option>{result.actions.map(value => <option key={value} value={value}>{auditActionLabel(value)}</option>)}</select></label>
        <label className="text-sm font-semibold text-deep-700">المنفذ<select value={actorUserId} onChange={event => setActorUserId(event.target.value)} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal"><option value="">كل المستخدمين</option>{result.actors.map(actor => <option key={actor.id} value={actor.id}>{actor.username}</option>)}</select></label>
        <label className="text-sm font-semibold text-deep-700">من تاريخ<input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" /></label>
        <label className="text-sm font-semibold text-deep-700">إلى تاريخ<input type="date" value={dateTo} min={dateFrom || undefined} onChange={event => setDateTo(event.target.value)} className="surface-field mt-1.5 w-full rounded-xl px-4 py-2.5 font-normal" /></label>
        <div className="flex items-end gap-2"><button disabled={busy || Boolean(dateFrom && dateTo && dateFrom > dateTo)} className="water-btn flex-1 rounded-xl px-4 py-2.5 font-bold text-white disabled:opacity-50">{busy ? 'جاري التحميل...' : 'تطبيق الفلاتر'}</button><button type="button" onClick={resetFilters} className="water-btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold">مسح الحقول</button></div>
      </div>
      {dateFrom && dateTo && dateFrom > dateTo && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساوياً له.</p>}
    </form>

    {error ? <AsyncState message={error} onRetry={() => void load(result.page)} /> : result.items.length === 0 ? <div className="glass-card rounded-2xl p-10 text-center text-deep-500">لا توجد عمليات مطابقة لهذه الفلاتر.</div> : <div className="space-y-3" aria-busy={busy}>
      {result.items.map(item => <article key={item.id} className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-deep-900">{auditActionLabel(item.action)}</h2><p className="mt-1 text-xs text-deep-500">نفذها <span className="font-semibold text-deep-700">{item.actor_username}</span></p></div><time dateTime={item.created_at} className="text-xs text-deep-500">{new Date(item.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
        <p className="mt-3 rounded-xl bg-water-50/60 px-3 py-2 text-sm leading-6 text-deep-700 dark:bg-slate-800/45">{formatAuditDetails(item.details)}</p>
        <p dir="ltr" className="mt-2 text-left text-[10px] text-deep-400">{item.action} · #{item.id}</p>
      </article>)}
    </div>}

    {result.pages > 1 && <nav className="flex items-center justify-center gap-3" aria-label="صفحات سجل التدقيق"><button type="button" disabled={busy || result.page <= 1} onClick={() => void load(result.page - 1)} className="water-btn-outline rounded-xl px-4 py-2 text-sm disabled:opacity-40">السابق</button><span className="text-sm text-deep-600">{result.page} من {result.pages}</span><button type="button" disabled={busy || result.page >= result.pages} onClick={() => void load(result.page + 1)} className="water-btn-outline rounded-xl px-4 py-2 text-sm disabled:opacity-40">التالي</button></nav>}
  </div>
}

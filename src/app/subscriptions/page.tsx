'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import AsyncState from '@/components/AsyncState'
import { api } from '@/lib/api'
import { currentMonthValue, formatMonthPeriod, monthRange } from '@/lib/month'
import {
  formatSubscriptionMoney,
  majorToMinor,
  minorToInput,
  paymentMethodLabel,
  selectedOutstandingTotal,
  SUBSCRIPTION_PAYMENT_METHODS,
} from '@/lib/subscriptions'
import type {
  SheikhInfo,
  SubscriptionMonthRecord,
  SubscriptionMonthsResponse,
  SubscriptionPaymentMethod,
  SubscriptionReceipt,
  SubscriptionSettings,
} from '@/lib/types'

const emptySummary: SubscriptionMonthsResponse['summary'] = {
  expected_minor: 0,
  collected_minor: 0,
  unpaid_minor: 0,
  paid_count: 0,
  unpaid_count: 0,
}

function todayValue() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="mobile-sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className={`mobile-sheet glass-strong max-h-[92vh] w-full overflow-y-auto rounded-2xl p-5 ${wide ? 'max-w-2xl' : 'max-w-md'}`} onClick={event => event.stopPropagation()}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-deep-900">{title}</h2>
        <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-xl text-deep-500 hover:bg-water-100" onClick={onClose} aria-label="إغلاق">×</button>
      </div>
      {children}
    </div>
  </div>
}

function PaymentForm({ count, totalMinor, currency, busy, onCancel, onSubmit }: {
  count: number
  totalMinor: number
  currency: string
  busy: boolean
  onCancel: () => void
  onSubmit: (data: { payment_date: string; payment_method: SubscriptionPaymentMethod; payment_note: string | null }) => Promise<void>
}) {
  const [paymentDate, setPaymentDate] = useState(todayValue())
  const [method, setMethod] = useState<SubscriptionPaymentMethod>('cash')
  const [note, setNote] = useState('')
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); void onSubmit({ payment_date: paymentDate, payment_method: method, payment_note: note.trim() || null }) }}>
    <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-800 dark:bg-cyan-950/30">
      <p className="text-sm text-deep-600">{count === 1 ? 'المبلغ المطلوب بالكامل' : `سداد كامل لعدد ${count} طلاب`}</p>
      <p className="mt-1 text-2xl font-bold text-cyan-700 dark:text-cyan-300">{formatSubscriptionMoney(totalMinor, currency)}</p>
    </div>
    <label className="block text-sm font-medium text-deep-700">تاريخ الدفع
      <input type="date" required value={paymentDate} onChange={event => setPaymentDate(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
    </label>
    <label className="block text-sm font-medium text-deep-700">طريقة الدفع
      <select required value={method} onChange={event => setMethod(event.target.value as SubscriptionPaymentMethod)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5">
        {SUBSCRIPTION_PAYMENT_METHODS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
    <label className="block text-sm font-medium text-deep-700">ملاحظة (اختياري)
      <textarea value={note} onChange={event => setNote(event.target.value)} rows={2} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
    </label>
    <div className="flex gap-3 pt-1">
      <button type="button" onClick={onCancel} className="water-btn-outline flex-1 rounded-xl px-4 py-2.5">إلغاء</button>
      <button type="submit" disabled={busy} className="water-btn flex-1 rounded-xl px-4 py-2.5 font-bold text-white disabled:opacity-50">{busy ? 'جاري التسجيل...' : 'تأكيد السداد'}</button>
    </div>
  </form>
}

function FeeForm({ record, currency, busy, onCancel, onSubmit }: {
  record: SubscriptionMonthRecord
  currency: string
  busy: boolean
  onCancel: () => void
  onSubmit: (currentMinor: number, futureMinor: number | null | undefined) => Promise<void>
}) {
  const [currentFee, setCurrentFee] = useState(minorToInput(record.fee_minor))
  const [updateFuture, setUpdateFuture] = useState(false)
  const [futureFee, setFutureFee] = useState(record.student_fee_override_minor == null ? '' : minorToInput(record.student_fee_override_minor))
  const [error, setError] = useState('')
  return <form className="space-y-4" onSubmit={event => {
    event.preventDefault()
    const currentMinor = majorToMinor(currentFee)
    const futureMinor = updateFuture && futureFee.trim() ? majorToMinor(futureFee) : updateFuture ? null : undefined
    if (currentMinor === null || (futureFee.trim() && futureMinor === null)) {
      setError('أدخل مبلغًا صحيحًا بحد أقصى منزلتين عشريتين.')
      return
    }
    void onSubmit(currentMinor, futureMinor)
  }}>
    <p className="text-sm text-deep-600">تعديل سجل الشهر متاح قبل تسجيل الدفع فقط.</p>
    <label className="block text-sm font-medium text-deep-700">مبلغ هذا الشهر ({currency})
      <input inputMode="decimal" required value={currentFee} onChange={event => setCurrentFee(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
    </label>
    {record.student_id !== null && <div className="rounded-xl border border-water-200 p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-deep-700"><input type="checkbox" checked={updateFuture} onChange={event => setUpdateFuture(event.target.checked)} /> تحديث رسوم الأشهر القادمة أيضًا</label>
      {updateFuture && <label className="mt-3 block text-sm font-medium text-deep-700">رسوم الأشهر القادمة ({currency})
        <input inputMode="decimal" value={futureFee} onChange={event => setFutureFee(event.target.value)} placeholder="فارغ = استخدام السعر الافتراضي" className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
        <span className="mt-1 block text-xs text-deep-500">اتركه فارغًا لمسح السعر الخاص، أو أدخل 0 لإعفاء الطالب.</span>
      </label>}
    </div>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex gap-3">
      <button type="button" onClick={onCancel} className="water-btn-outline flex-1 rounded-xl px-4 py-2.5">إلغاء</button>
      <button type="submit" disabled={busy} className="water-btn flex-1 rounded-xl px-4 py-2.5 font-bold text-white disabled:opacity-50">حفظ</button>
    </div>
  </form>
}

function ReceiptView({ receipt, currency, onClose }: { receipt: SubscriptionReceipt; currency: string; onClose: () => void }) {
  const receiptCurrency = receipt.currency || currency
  return <Modal title="إيصال الاشتراك" onClose={onClose} wide>
    <article className="print-receipt rounded-2xl border border-water-300 bg-white p-6 text-slate-900" dir="rtl">
      <header className="border-b border-slate-300 pb-4 text-center">
        <p className="text-xl font-bold">{receipt.tahfiz_name}</p>
        <p className="mt-1 text-sm">إيصال سداد اشتراك شهري</p>
      </header>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-500">رقم الإيصال</dt><dd className="font-bold">{receipt.receipt_number}</dd></div>
        <div><dt className="text-slate-500">الطالب</dt><dd className="font-bold">{receipt.student_name}</dd></div>
        <div><dt className="text-slate-500">الفترة</dt><dd>{receipt.period_start} — {receipt.period_end}</dd></div>
        <div><dt className="text-slate-500">المبلغ</dt><dd className="font-bold">{formatSubscriptionMoney(receipt.fee_minor, receiptCurrency)}</dd></div>
        <div><dt className="text-slate-500">تاريخ الدفع</dt><dd>{receipt.payment_date || '—'}</dd></div>
        <div><dt className="text-slate-500">طريقة الدفع</dt><dd>{paymentMethodLabel(receipt.payment_method)}</dd></div>
        {receipt.recorded_by_username && <div><dt className="text-slate-500">سجله</dt><dd>{receipt.recorded_by_username}</dd></div>}
        {receipt.payment_note && <div className="sm:col-span-2"><dt className="text-slate-500">ملاحظة</dt><dd>{receipt.payment_note}</dd></div>}
      </dl>
    </article>
    <button type="button" onClick={() => window.print()} className="water-btn mt-4 w-full rounded-xl px-4 py-2.5 font-bold text-white">طباعة الإيصال</button>
  </Modal>
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null)
  const [sheikhs, setSheikhs] = useState<SheikhInfo[]>([])
  const [records, setRecords] = useState<SubscriptionMonthRecord[]>([])
  const [summary, setSummary] = useState(emptySummary)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [period, setPeriod] = useState(() => monthRange(currentMonthValue(), 1).start)
  const [monthStartDay, setMonthStartDay] = useState(1)
  const [studentIdFilter, setStudentIdFilter] = useState<number | undefined>()
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [sheikhId, setSheikhId] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [payingRecord, setPayingRecord] = useState<SubscriptionMonthRecord | null>(null)
  const [bulkPaying, setBulkPaying] = useState(false)
  const [editingRecord, setEditingRecord] = useState<SubscriptionMonthRecord | null>(null)
  const [receipt, setReceipt] = useState<SubscriptionReceipt | null>(null)
  const [activationFee, setActivationFee] = useState('')
  const [activationCurrency, setActivationCurrency] = useState('EGP')
  const [showSettings, setShowSettings] = useState(false)
  const [settingsEnabled, setSettingsEnabled] = useState(true)

  const currency = settings?.currency || 'EGP'
  const pageSize = 30
  const paidValue = paidFilter === 'all' ? undefined : paidFilter === 'paid'

  const loadRecords = useCallback(async () => {
    if (!settings?.enabled) return
    setListLoading(true)
    setError('')
    try {
      const data = await api.getSubscriptionMonths({
        period,
        paid: paidValue,
        sheikh_id: sheikhId ? Number(sheikhId) : undefined,
        student_id: studentIdFilter,
        search: search || undefined,
        page,
        page_size: pageSize,
      })
      setRecords(data.items)
      setTotal(data.total)
      setSummary(data.summary)
      setSelected(new Set())
    } catch (reason: any) {
      setError(reason.message || 'تعذر تحميل اشتراكات الشهر')
    } finally {
      setListLoading(false)
    }
  }, [page, paidValue, period, search, settings?.enabled, sheikhId, studentIdFilter])

  useEffect(() => {
    let cancelled = false
    async function loadInitial() {
      try {
        const user = await api.getMe()
        if (user.role !== 'admin' && user.role !== 'super_admin') {
          router.replace('/dashboard')
          return
        }
        const startDay = user.tahfiz?.month_start_day || 1
        setMonthStartDay(startDay)
        const requestedStudentId = Number(new URLSearchParams(window.location.search).get('student_id'))
        if (Number.isInteger(requestedStudentId) && requestedStudentId > 0) setStudentIdFilter(requestedStudentId)
        const [nextSettings, nextSheikhs] = await Promise.all([api.getSubscriptionSettings(), api.getSheikhs()])
        if (cancelled) return
        setSettings(nextSettings)
        setActivationFee(minorToInput(nextSettings.default_monthly_fee_minor))
        setActivationCurrency(nextSettings.currency || 'EGP')
        setSettingsEnabled(nextSettings.enabled)
        setSheikhs(nextSheikhs)
        const effectiveStartDay = nextSettings.month_start_day || startDay
        setMonthStartDay(effectiveStartDay)
        setPeriod(nextSettings.current_period_start || monthRange(currentMonthValue(effectiveStartDay), effectiveStartDay).start)
      } catch (reason: any) {
        if (!cancelled) setError(reason.message || 'تعذر تحميل إعدادات الاشتراكات')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadInitial()
    return () => { cancelled = true }
  }, [router])

  useEffect(() => { void loadRecords() }, [loadRecords])

  const selectedTotal = useMemo(() => selectedOutstandingTotal(records, selected), [records, selected])
  const unpaidOnPage = records.filter(record => !record.is_paid && record.fee_minor > 0)
  const allVisibleSelected = unpaidOnPage.length > 0 && unpaidOnPage.every(record => selected.has(record.id))

  async function activate(event: React.FormEvent) {
    event.preventDefault()
    const feeMinor = majorToMinor(activationFee)
    if (feeMinor === null || feeMinor <= 0) {
      setError('أدخل رسومًا شهرية صحيحة أكبر من صفر.')
      return
    }
    if (!window.confirm('سيتم إنشاء رسوم الدورة الحالية كاملة لكل الطلاب المقيدين، دون إضافة ديون للأشهر السابقة. هل تريد التفعيل؟')) return
    setBusy(true)
    setError('')
    try {
      const updated = await api.updateSubscriptionSettings({ enabled: true, default_monthly_fee_minor: feeMinor, currency: activationCurrency })
      setSettings(updated)
      setNotice('تم تفعيل الاشتراكات وإنشاء سجلات الدورة الحالية.')
    } catch (reason: any) {
      setError(reason.message || 'تعذر تفعيل الاشتراكات')
    } finally {
      setBusy(false)
    }
  }

  async function submitPayment(recordIds: number[], data: { payment_date: string; payment_method: SubscriptionPaymentMethod; payment_note: string | null }) {
    setBusy(true)
    setError('')
    try {
      if (recordIds.length === 1) await api.markSubscriptionPaid(recordIds[0], data)
      else await api.bulkMarkSubscriptionsPaid(recordIds, data)
      setPayingRecord(null)
      setBulkPaying(false)
      setNotice(recordIds.length === 1 ? 'تم تسجيل السداد.' : `تم تسجيل سداد ${recordIds.length} طلاب.`)
      await loadRecords()
    } catch (reason: any) {
      setError(reason.message || 'تعذر تسجيل السداد. تم تحديث القائمة لتجنب تكرار العملية.')
      await loadRecords()
    } finally {
      setBusy(false)
    }
  }

  async function saveFee(currentMinor: number, futureMinor: number | null | undefined) {
    if (!editingRecord) return
    if (!window.confirm(`تأكيد تعديل رسوم ${editingRecord.student_name}؟ سيُسجّل التغيير في سجل التدقيق.`)) return
    setBusy(true)
    setError('')
    try {
      await api.updateSubscriptionMonth(editingRecord.id, currentMinor, futureMinor)
      setEditingRecord(null)
      setNotice('تم تحديث الرسوم.')
      await loadRecords()
    } catch (reason: any) {
      setError(reason.message || 'تعذر تحديث الرسوم')
    } finally {
      setBusy(false)
    }
  }

  async function makeUnpaid(record: SubscriptionMonthRecord) {
    if (!window.confirm(`إلغاء سداد ${record.student_name} لهذا الشهر؟ ستُمسح بيانات الدفع مع الاحتفاظ بسجل العملية.`)) return
    setBusy(true)
    setError('')
    try {
      await api.markSubscriptionUnpaid(record.id)
      setNotice('تمت إعادة السجل إلى غير مدفوع.')
      await loadRecords()
    } catch (reason: any) {
      setError(reason.message || 'تعذر إلغاء السداد')
    } finally {
      setBusy(false)
    }
  }

  async function showReceipt(record: SubscriptionMonthRecord) {
    setBusy(true)
    try {
      setReceipt(await api.getSubscriptionReceipt(record.id))
    } catch (reason: any) {
      setError(reason.message || 'تعذر تحميل الإيصال')
    } finally {
      setBusy(false)
    }
  }

  async function exportExcel() {
    setBusy(true)
    setError('')
    try {
      const rows = await api.exportSubscriptions({ period, paid: paidValue, sheikh_id: sheikhId ? Number(sheikhId) : undefined, student_id: studentIdFilter, search: search || undefined })
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('الاشتراكات', { views: [{ rightToLeft: true }] })
      const safeText = (value: string | null | undefined) => {
        const text = value || ''
        return /^[=+\-@]/.test(text) ? `'${text}` : text
      }
      sheet.columns = [
        { header: 'الطالب', key: 'student', width: 28 }, { header: 'رقم الطالب', key: 'code', width: 16 },
        { header: 'الشيخ', key: 'sheikh', width: 24 }, { header: 'بداية الفترة', key: 'start', width: 16 },
        { header: 'نهاية الفترة', key: 'end', width: 16 }, { header: `المبلغ (${currency})`, key: 'amount', width: 16 },
        { header: 'الحالة', key: 'status', width: 14 }, { header: 'تاريخ الدفع', key: 'date', width: 16 },
        { header: 'طريقة الدفع', key: 'method', width: 18 }, { header: 'رقم الإيصال', key: 'receipt', width: 18 },
        { header: 'ملاحظة', key: 'note', width: 28 },
      ]
      rows.forEach(record => sheet.addRow({
        student: safeText(record.student_name), code: safeText(record.student_code), sheikh: safeText(record.sheikh_name),
        start: record.period_start, end: record.period_end, amount: record.fee_minor / 100,
        status: record.fee_minor === 0 ? 'معفى' : record.is_paid ? 'مدفوع' : 'غير مدفوع', date: record.payment_date || '',
        method: paymentMethodLabel(record.payment_method), receipt: safeText(record.receipt_number), note: safeText(record.payment_note),
      }))
      sheet.getRow(1).font = { bold: true }
      sheet.getColumn('amount').numFmt = '#,##0.00'
      sheet.autoFilter = { from: 'A1', to: 'K1' }
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `subscriptions-${period}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch (reason: any) {
      setError(reason.message || 'تعذر تصدير سجل الاشتراكات')
    } finally {
      setBusy(false)
    }
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault()
    const feeMinor = majorToMinor(activationFee)
    if (feeMinor === null || feeMinor <= 0) { setError('أدخل رسومًا افتراضية صحيحة أكبر من صفر.'); return }
    if (!settingsEnabled && !window.confirm('إيقاف الاشتراكات يمنع إنشاء سجلات جديدة، لكنه لا يحذف السجلات الحالية. هل تريد المتابعة؟')) return
    setBusy(true)
    setError('')
    try {
      const updated = await api.updateSubscriptionSettings({ enabled: settingsEnabled, default_monthly_fee_minor: feeMinor, currency: activationCurrency })
      setSettings(updated)
      setShowSettings(false)
      setNotice('تم حفظ إعدادات الاشتراكات.')
    } catch (reason: any) {
      setError(reason.message || 'تعذر حفظ إعدادات الاشتراكات')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page-loading" aria-label="جاري تحميل الاشتراكات" />
  if (!settings && error) return <AsyncState message={error} onRetry={() => window.location.reload()} />

  if (!settings?.enabled) return <div className="mx-auto max-w-2xl space-y-5">
    <div><Link href="/manage" className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">الإدارة ‹</Link><h1 className="mt-2 text-3xl font-bold text-deep-900">الاشتراكات</h1></div>
    <section className="glass-card rounded-2xl p-6 md:p-8">
      <div className="mb-5 text-center"><div className="text-4xl">🧾</div><h2 className="mt-3 text-xl font-bold text-deep-900">تفعيل الاشتراكات الشهرية</h2><p className="mt-2 text-sm text-deep-500">سيبدأ السجل من الدورة الحالية فقط، وسيُحسب كامل المبلغ لكل طالب مقيد.</p></div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      <form onSubmit={activate} className="space-y-4">
        <label className="block text-sm font-medium text-deep-700">الرسوم الشهرية الافتراضية
          <input inputMode="decimal" required value={activationFee} onChange={event => setActivationFee(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
        </label>
        <label className="block text-sm font-medium text-deep-700">العملة
          <select value={activationCurrency} onChange={event => setActivationCurrency(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5"><option value="EGP">جنيه مصري (EGP)</option><option value="SAR">ريال سعودي (SAR)</option><option value="USD">دولار أمريكي (USD)</option></select>
        </label>
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">لا تُضاف رسوم تاريخية. السفر وغياب بعذر لا يوقفان الاشتراك تلقائيًا.</div>
        <button disabled={busy} className="water-btn w-full rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'جاري التفعيل...' : 'تفعيل وإنشاء الدورة الحالية'}</button>
      </form>
    </section>
  </div>

  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><Link href="/manage" className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">الإدارة ‹</Link><h1 className="mt-1 text-2xl font-bold text-deep-900">الاشتراكات</h1><p className="mt-1 text-sm text-deep-500">متابعة الرسوم الشهرية وتسجيل السداد</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => setShowSettings(true)} className="water-btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold">إعدادات الاشتراكات</button><button type="button" onClick={() => void exportExcel()} disabled={busy} className="water-btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">تنزيل Excel</button></div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</div>}

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {[
        ['المتوقع', summary.expected_minor, 'text-deep-900'],
        ['المحصل', summary.collected_minor, 'text-emerald-600'],
        ['غير المحصل', summary.unpaid_minor, 'text-amber-600'],
      ].map(([label, value, color]) => <div key={String(label)} className="glass-card rounded-2xl p-4"><p className="text-xs text-deep-500">{label}</p><p className={`mt-2 text-xl font-bold ${color}`}>{formatSubscriptionMoney(Number(value), currency)}</p></div>)}
      <div className="glass-card rounded-2xl p-4"><p className="text-xs text-deep-500">مدفوع</p><p className="mt-2 text-xl font-bold text-emerald-600">{summary.paid_count}</p></div>
      <div className="glass-card rounded-2xl p-4"><p className="text-xs text-deep-500">غير مدفوع</p><p className="mt-2 text-xl font-bold text-amber-600">{summary.unpaid_count}</p></div>
    </section>

    <section className="glass-card rounded-2xl p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-deep-600">الدورة
          <input type="month" value={period.slice(0, 7)} onChange={event => { setPeriod(monthRange(event.target.value, monthStartDay).start); setPage(1) }} className="surface-field mt-1 w-full rounded-xl px-3 py-2.5 text-sm" />
        </label>
        <label className="text-xs font-medium text-deep-600">حالة السداد
          <select value={paidFilter} onChange={event => { setPaidFilter(event.target.value as typeof paidFilter); setPage(1) }} className="surface-field mt-1 w-full rounded-xl px-3 py-2.5 text-sm"><option value="all">الكل</option><option value="paid">مدفوع</option><option value="unpaid">غير مدفوع</option></select>
        </label>
        <label className="text-xs font-medium text-deep-600">الشيخ
          <select value={sheikhId} onChange={event => { setSheikhId(event.target.value); setPage(1) }} className="surface-field mt-1 w-full rounded-xl px-3 py-2.5 text-sm"><option value="">كل الشيوخ</option>{sheikhs.map(sheikh => <option key={sheikh.id} value={sheikh.id}>{sheikh.name}</option>)}</select>
        </label>
        <form className="md:col-span-2" onSubmit={event => { event.preventDefault(); setSearch(searchDraft.trim()); setPage(1) }}><label className="text-xs font-medium text-deep-600">بحث بالاسم أو الرقم أو الهاتف أو الشيخ
          <span className="mt-1 flex gap-2"><input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} className="surface-field min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm" placeholder="ابحث عن طالب..." /><button className="water-btn rounded-xl px-4 text-sm font-bold text-white">بحث</button></span>
        </label></form>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-deep-500">الدورة المعروضة: {formatMonthPeriod(period.slice(0, 7), monthStartDay)}</p>{studentIdFilter && <button type="button" onClick={() => { setStudentIdFilter(undefined); setPage(1) }} className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">عرض كل الطلاب ×</button>}</div>
    </section>

    {selected.size > 0 && <div className="sticky top-3 z-20 flex flex-col gap-3 rounded-2xl border border-cyan-300 bg-cyan-50/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-cyan-800 dark:bg-cyan-950/95">
      <div><p className="font-bold text-deep-900">تم تحديد {selected.size} طلاب</p><p className="text-sm text-deep-600">الإجمالي: {formatSubscriptionMoney(selectedTotal, currency)}</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => setSelected(new Set())} className="water-btn-outline rounded-xl px-4 py-2 text-sm">إلغاء التحديد</button><button type="button" onClick={() => setBulkPaying(true)} className="water-btn rounded-xl px-4 py-2 text-sm font-bold text-white">تسجيل السداد</button></div>
    </div>}

    <section className="glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-water-200 p-4"><label className="flex items-center gap-2 text-sm text-deep-700"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(unpaidOnPage.map(record => record.id)))} /> تحديد غير المدفوع في الصفحة</label><span className="text-xs text-deep-500">{total} سجل</span></div>
      {listLoading ? <div className="page-loading my-12" aria-label="جاري تحميل السجلات" /> : records.length === 0 ? <div className="p-12 text-center text-deep-500">لا توجد اشتراكات مطابقة لهذه الفلاتر.</div> : <div className="divide-y divide-water-200/60">
        {records.map(record => <article key={record.id} className="grid gap-3 p-4 hover:bg-water-50/40 md:grid-cols-[auto_1.4fr_1fr_1fr_auto] md:items-center">
          <input type="checkbox" aria-label={`تحديد ${record.student_name}`} disabled={record.is_paid || record.fee_minor === 0} checked={selected.has(record.id)} onChange={() => setSelected(previous => { const next = new Set(previous); next.has(record.id) ? next.delete(record.id) : next.add(record.id); return next })} className="h-4 w-4" />
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-deep-900">{record.student_name}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${record.fee_minor === 0 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : record.is_paid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>{record.fee_minor === 0 ? 'معفى' : record.is_paid ? 'مدفوع' : 'غير مدفوع'}</span></div><p className="mt-1 text-xs text-deep-500">{record.student_code ? `رقم ${record.student_code} · ` : ''}{record.sheikh_name || 'دون شيخ'}{record.student_id === null ? ' · طالب محذوف' : ''}</p></div>
          <div><p className="text-xs text-deep-500">الرسوم</p><p className="font-bold text-deep-900">{formatSubscriptionMoney(record.fee_minor, currency)}</p></div>
          <div className="text-sm"><p className="text-xs text-deep-500">{record.is_paid ? 'بيانات الدفع' : 'الفترة'}</p><p className="text-deep-700">{record.is_paid ? `${record.payment_date} · ${paymentMethodLabel(record.payment_method)}` : `${record.period_start} — ${record.period_end}`}</p></div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {record.is_paid ? <><button type="button" disabled={busy} onClick={() => void showReceipt(record)} className="water-btn-outline rounded-lg px-3 py-1.5 text-xs">الإيصال</button><button type="button" disabled={busy} onClick={() => void makeUnpaid(record)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 dark:border-red-800 dark:text-red-300">إلغاء السداد</button></> : <><button type="button" onClick={() => setEditingRecord(record)} className="water-btn-outline rounded-lg px-3 py-1.5 text-xs">تعديل الرسوم</button>{record.fee_minor > 0 && <button type="button" onClick={() => setPayingRecord(record)} className="water-btn rounded-lg px-3 py-1.5 text-xs font-bold text-white">سداد</button>}</>}
            {record.student_id !== null && <Link href={`/students/${record.student_id}`} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300">ملف الطالب</Link>}
          </div>
        </article>)}
      </div>}
    </section>

    {pages > 1 && <nav className="flex items-center justify-center gap-3" aria-label="صفحات الاشتراكات"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="water-btn-outline rounded-xl px-4 py-2 text-sm disabled:opacity-40">السابق</button><span className="text-sm text-deep-600">{page} من {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage(value => value + 1)} className="water-btn-outline rounded-xl px-4 py-2 text-sm disabled:opacity-40">التالي</button></nav>}

    {payingRecord && <Modal title={`سداد اشتراك — ${payingRecord.student_name}`} onClose={() => setPayingRecord(null)}><PaymentForm count={1} totalMinor={payingRecord.fee_minor} currency={currency} busy={busy} onCancel={() => setPayingRecord(null)} onSubmit={data => submitPayment([payingRecord.id], data)} /></Modal>}
    {bulkPaying && <Modal title="تسجيل سداد جماعي" onClose={() => setBulkPaying(false)}><PaymentForm count={selected.size} totalMinor={selectedTotal} currency={currency} busy={busy} onCancel={() => setBulkPaying(false)} onSubmit={data => submitPayment(Array.from(selected), data)} /></Modal>}
    {editingRecord && <Modal title={`تعديل رسوم — ${editingRecord.student_name}`} onClose={() => setEditingRecord(null)}><FeeForm record={editingRecord} currency={currency} busy={busy} onCancel={() => setEditingRecord(null)} onSubmit={saveFee} /></Modal>}
    {receipt && <ReceiptView receipt={receipt} currency={currency} onClose={() => setReceipt(null)} />}
    {showSettings && <Modal title="إعدادات الاشتراكات" onClose={() => setShowSettings(false)}><form onSubmit={saveSettings} className="space-y-4"><label className="block text-sm font-medium text-deep-700">الرسوم الافتراضية ({activationCurrency})<input inputMode="decimal" value={activationFee} onChange={event => setActivationFee(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" /></label><label className="block text-sm font-medium text-deep-700">العملة<select value={activationCurrency} onChange={event => setActivationCurrency(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5"><option value="EGP">جنيه مصري (EGP)</option><option value="SAR">ريال سعودي (SAR)</option><option value="USD">دولار أمريكي (USD)</option></select></label><label className="flex items-center gap-2 rounded-xl border border-water-200 p-3 text-sm font-medium text-deep-700"><input type="checkbox" checked={settingsEnabled} onChange={event => setSettingsEnabled(event.target.checked)} /> الاشتراكات مفعلة</label><button disabled={busy} className="water-btn w-full rounded-xl px-4 py-2.5 font-bold text-white disabled:opacity-50">حفظ الإعدادات</button></form></Modal>}
  </div>
}

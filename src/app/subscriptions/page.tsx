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
  ExpenseCategory,
  ExpenseRecord,
  FinanceOverview,
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
      <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{formatSubscriptionMoney(totalMinor, currency)}</p>
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
  onSubmit: (scope: 'current' | 'future', feeMinor: number | null) => Promise<void>
}) {
  const [scope, setScope] = useState<'current' | 'future' | ''>(record.is_paid ? 'future' : '')
  const [currentFee, setCurrentFee] = useState(minorToInput(record.fee_minor))
  const [futureFee, setFutureFee] = useState(record.student_fee_override_minor == null ? '' : minorToInput(record.student_fee_override_minor))
  const [error, setError] = useState('')
  return <form className="space-y-4" onSubmit={event => {
    event.preventDefault()
    if (!scope) {
      setError('اختر هل تريد تطبيق التعديل على هذا الشهر فقط أم على الأشهر القادمة فقط.')
      return
    }
    const currentMinor = majorToMinor(currentFee)
    const futureMinor = futureFee.trim() ? majorToMinor(futureFee) : null
    if ((scope === 'current' && currentMinor === null) || (scope === 'future' && futureFee.trim() && futureMinor === null)) {
      setError('أدخل مبلغًا صحيحًا بحد أقصى منزلتين عشريتين.')
      return
    }
    void onSubmit(scope, scope === 'current' ? currentMinor : futureMinor)
  }}>
    <fieldset className="space-y-2">
      <legend className="text-sm font-bold text-deep-800">متى تريد تطبيق الرسوم الجديدة؟</legend>
      {!record.is_paid && <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${scope === 'current' ? 'border-cyan-400 bg-cyan-50/60 dark:bg-cyan-900/20' : 'border-water-200'}`}><input type="radio" name="fee-scope" value="current" checked={scope === 'current'} onChange={() => { setScope('current'); setError('') }} /><span><strong className="block text-sm text-deep-800">هذا الشهر فقط</strong><span className="text-xs text-deep-500">يُعدّل السجل الحالي ولا يغيّر رسوم الأشهر القادمة.</span></span></label>}
      {record.student_id !== null && <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${scope === 'future' ? 'border-cyan-400 bg-cyan-50/60 dark:bg-cyan-900/20' : 'border-water-200'}`}><input type="radio" name="fee-scope" value="future" checked={scope === 'future'} onChange={() => { setScope('future'); setError('') }} /><span><strong className="block text-sm text-deep-800">الأشهر القادمة فقط</strong><span className="text-xs text-deep-500">يبدأ من الدورة القادمة ولا يغيّر مبلغ هذا الشهر.</span></span></label>}
    </fieldset>
    {scope === 'current' && <label className="block text-sm font-medium text-deep-700">مبلغ هذا الشهر ({currency})
      <input inputMode="decimal" required value={currentFee} onChange={event => setCurrentFee(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
    </label>}
    {scope === 'future' && <label className="block text-sm font-medium text-deep-700">رسوم الأشهر القادمة ({currency})
      <input inputMode="decimal" value={futureFee} onChange={event => setFutureFee(event.target.value)} placeholder="فارغ = استخدام السعر الافتراضي" className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" />
      <span className="mt-1 block text-xs text-deep-500">اتركه فارغًا لاستخدام السعر الافتراضي، أو أدخل 0 لإعفاء الطالب.</span>
    </label>}
    {record.is_paid && <p className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">هذا الشهر مدفوع ومغلق؛ يمكن تعديل رسوم الأشهر القادمة فقط.</p>}
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

function ExpenseForm({ expense, categories, currency, busy, onCancel, onSubmit }: {
  expense: ExpenseRecord | null
  categories: ExpenseCategory[]
  currency: string
  busy: boolean
  onCancel(): void
  onSubmit(data: { name: string; category_id: string; amount_minor: number; expense_date: string; payment_method: SubscriptionPaymentMethod; note: string | null }): Promise<void>
}) {
  const available = categories.filter(category => category.enabled || category.id === expense?.category_id)
  const [name, setName] = useState(expense?.name || '')
  const [categoryId, setCategoryId] = useState(expense?.category_id || available[0]?.id || '')
  const [amount, setAmount] = useState(expense ? minorToInput(expense.amount_minor) : '')
  const [expenseDate, setExpenseDate] = useState(expense?.expense_date || todayValue())
  const [method, setMethod] = useState<SubscriptionPaymentMethod>(expense?.payment_method || 'cash')
  const [note, setNote] = useState(expense?.note || '')
  const [formError, setFormError] = useState('')
  return <form className="space-y-4" onSubmit={event => {
    event.preventDefault()
    const amountMinor = majorToMinor(amount)
    if (!name.trim() || !categoryId || amountMinor === null || amountMinor <= 0) { setFormError('أدخل اسم المصروف والتصنيف ومبلغًا صحيحًا أكبر من صفر.'); return }
    void onSubmit({ name: name.trim(), category_id: categoryId, amount_minor: amountMinor, expense_date: expenseDate, payment_method: method, note: note.trim() || null })
  }}>
    <label className="block text-sm font-medium text-deep-700">اسم المصروف<input required value={name} onChange={event => setName(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" /></label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium text-deep-700">التصنيف<select required value={categoryId} onChange={event => setCategoryId(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5">{available.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
      <label className="text-sm font-medium text-deep-700">المبلغ ({currency})<input inputMode="decimal" required value={amount} onChange={event => setAmount(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" /></label>
      <label className="text-sm font-medium text-deep-700">تاريخ المصروف<input type="date" max={todayValue()} required value={expenseDate} onChange={event => setExpenseDate(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" /></label>
      <label className="text-sm font-medium text-deep-700">طريقة الدفع<select value={method} onChange={event => setMethod(event.target.value as SubscriptionPaymentMethod)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5">{SUBSCRIPTION_PAYMENT_METHODS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    </div>
    <label className="block text-sm font-medium text-deep-700">ملاحظة (اختياري)<textarea rows={2} value={note} onChange={event => setNote(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" /></label>
    {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
    <div className="flex gap-3"><button type="button" onClick={onCancel} className="water-btn-outline flex-1 rounded-xl px-4 py-2.5">إلغاء</button><button disabled={busy} className="water-btn flex-1 rounded-xl px-4 py-2.5 font-bold text-white disabled:opacity-50">{expense ? 'حفظ التعديل' : 'إضافة المصروف'}</button></div>
  </form>
}

function BulkCorrectionForm({ period, currency, busy, onCancel, onSubmit }: { period: string; currency: string; busy: boolean; onCancel(): void; onSubmit(from: number, to: number): Promise<void> }) {
  const [fromValue, setFromValue] = useState('')
  const [toValue, setToValue] = useState('')
  const [formError, setFormError] = useState('')
  return <form className="space-y-4" onSubmit={event => { event.preventDefault(); const from = majorToMinor(fromValue); const to = majorToMinor(toValue); if (from === null || from <= 0 || to === null || from === to) { setFormError('أدخل قيمتين صحيحتين ومختلفتين.'); return } void onSubmit(from, to) }}>
    <p className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">سيتم تعديل السجلات غير المدفوعة المطابقة للقيمة القديمة في دورة {period} فقط. لن تتغير الإعفاءات أو الرسوم المخصصة أو الإيصالات المدفوعة.</p>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-deep-700">القيمة القديمة ({currency})<input inputMode="decimal" required value={fromValue} onChange={event => setFromValue(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" /></label><label className="text-sm font-medium text-deep-700">القيمة الجديدة ({currency})<input inputMode="decimal" required value={toValue} onChange={event => setToValue(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" /></label></div>
    {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
    <div className="flex gap-3"><button type="button" onClick={onCancel} className="water-btn-outline flex-1 rounded-xl px-4 py-2.5">إلغاء</button><button disabled={busy} className="water-btn flex-1 rounded-xl px-4 py-2.5 font-bold text-white disabled:opacity-50">تطبيق التصحيح</button></div>
  </form>
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
  const [overview, setOverview] = useState<FinanceOverview | null>(null)
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('')
  const [expenseMethodFilter, setExpenseMethodFilter] = useState('')
  const [expenseSearch, setExpenseSearch] = useState('')
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null | undefined>(undefined)
  const [showBulkCorrection, setShowBulkCorrection] = useState(false)
  const [activeSection, setActiveSection] = useState<'subscriptions' | 'expenses'>('subscriptions')

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

  const loadFinance = useCallback(async () => {
    try {
      const [nextOverview, expensePage] = await Promise.all([
        api.getFinanceOverview(period),
        api.getExpenses({ period, category_id: expenseCategoryFilter || undefined, payment_method: expenseMethodFilter ? expenseMethodFilter as SubscriptionPaymentMethod : undefined, search: expenseSearch || undefined, page_size: 200 }),
      ])
      setOverview(nextOverview)
      setExpenses(expensePage.items)
    } catch (reason: any) {
      setError(reason.message || 'تعذر تحميل البيانات المالية')
    }
  }, [expenseCategoryFilter, expenseMethodFilter, expenseSearch, period])

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
        const [nextSettings, nextSheikhs, tahfizSettings] = await Promise.all([api.getSubscriptionSettings(), api.getSheikhs(), api.getTahfizSettings()])
        if (cancelled) return
        setSettings(nextSettings)
        setActivationFee(minorToInput(nextSettings.default_monthly_fee_minor))
        setActivationCurrency(nextSettings.currency || 'EGP')
        setSettingsEnabled(nextSettings.enabled)
        setSheikhs(nextSheikhs)
        setExpenseCategories(tahfizSettings.expense_categories || [])
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
  useEffect(() => { if (!loading) void loadFinance() }, [loadFinance, loading])

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

  async function saveFee(scope: 'current' | 'future', feeMinor: number | null) {
    if (!editingRecord) return
    const scopeLabel = scope === 'current' ? 'هذا الشهر فقط' : 'الأشهر القادمة فقط'
    if (!window.confirm(`تأكيد تعديل رسوم ${editingRecord.student_name} لـ ${scopeLabel}؟ سيُسجّل التغيير في سجل التدقيق.`)) return
    setBusy(true)
    setError('')
    try {
      if (scope === 'current') {
        if (feeMinor === null) throw new Error('أدخل مبلغ هذا الشهر.')
        await api.updateSubscriptionMonth(editingRecord.id, feeMinor)
      } else {
        if (editingRecord.student_id === null) throw new Error('لا يمكن تعديل الرسوم القادمة لطالب محذوف.')
        await api.updateStudentSubscriptionFee(editingRecord.student_id, feeMinor)
      }
      setEditingRecord(null)
      setNotice(scope === 'current' ? 'تم تحديث رسوم هذا الشهر فقط.' : 'تم تحديث رسوم الأشهر القادمة فقط دون تغيير الشهر الحالي.')
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
      const sheet = workbook.addWorksheet('الاشتراكات', { views: [{ rightToLeft: true }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true, printTitlesRow: '1:1', margins: { left: 0.1, right: 0.1, top: 0.15, bottom: 0.15, header: 0.05, footer: 0.05 } } })
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
      sheet.pageSetup.printArea = `A1:K${sheet.rowCount}`
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
    if (expenseCategories.length === 0 || expenseCategories.some(category => !category.label.trim()) || !expenseCategories.some(category => category.enabled)) {
      setError('أضف تصنيفًا واحدًا مفعلًا على الأقل، وتأكد من أن كل الأسماء مكتملة.')
      return
    }
    if (!settingsEnabled && !window.confirm('إيقاف الاشتراكات يمنع إنشاء سجلات جديدة، لكنه لا يحذف السجلات الحالية. هل تريد المتابعة؟')) return
    setBusy(true)
    setError('')
    try {
      await api.updateTahfizSettings({ expense_categories: expenseCategories })
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

  async function saveExpense(data: { name: string; category_id: string; amount_minor: number; expense_date: string; payment_method: SubscriptionPaymentMethod; note: string | null }) {
    setBusy(true); setError('')
    try {
      if (editingExpense) await api.updateExpense(editingExpense.id, data)
      else await api.createExpense(data)
      setEditingExpense(undefined)
      setNotice(editingExpense ? 'تم تحديث المصروف.' : 'تمت إضافة المصروف.')
      await loadFinance()
    } catch (reason: any) { setError(reason.message || 'تعذر حفظ المصروف') } finally { setBusy(false) }
  }

  async function removeExpense(expense: ExpenseRecord) {
    if (!window.confirm(`حذف المصروف «${expense.name}»؟ سيبقى الإجراء محفوظًا في سجل التدقيق.`)) return
    setBusy(true); setError('')
    try { await api.deleteExpense(expense.id); setNotice('تم حذف المصروف.'); await loadFinance() }
    catch (reason: any) { setError(reason.message || 'تعذر حذف المصروف') }
    finally { setBusy(false) }
  }

  async function correctMonth(fromFeeMinor: number, toFeeMinor: number) {
    if (!window.confirm('تأكيد التصحيح الجماعي لهذا الشهر؟ سيُسجل الإجراء في سجل التدقيق.')) return
    setBusy(true); setError('')
    try {
      const result = await api.bulkCorrectSubscriptionAmount({ period, from_fee_minor: fromFeeMinor, to_fee_minor: toFeeMinor })
      setShowBulkCorrection(false)
      setNotice(`تم تحديث ${result.updated} سجل وتجاوز ${result.skipped} سجل غير مطابق أو محمي.`)
      await Promise.all([loadRecords(), loadFinance()])
    } catch (reason: any) { setError(reason.message || 'تعذر تصحيح رسوم الشهر') }
    finally { setBusy(false) }
  }

  async function exportExpenseExcel() {
    setBusy(true); setError('')
    try {
      const rows = await api.exportExpenses({ period, category_id: expenseCategoryFilter || undefined, payment_method: expenseMethodFilter ? expenseMethodFilter as SubscriptionPaymentMethod : undefined, search: expenseSearch || undefined })
      const ExcelJS = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('المصروفات', { views: [{ rightToLeft: true }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true, printTitlesRow: '1:1', margins: { left: 0.1, right: 0.1, top: 0.15, bottom: 0.15, header: 0.05, footer: 0.05 } } })
      sheet.columns = [{ header: 'المصروف', key: 'name', width: 28 }, { header: 'التصنيف', key: 'category', width: 18 }, { header: 'التاريخ', key: 'date', width: 16 }, { header: `المبلغ (${currency})`, key: 'amount', width: 16 }, { header: 'طريقة الدفع', key: 'method', width: 18 }, { header: 'ملاحظة', key: 'note', width: 30 }]
      rows.forEach(row => sheet.addRow({ name: row.name, category: row.category_label, date: row.expense_date, amount: row.amount_minor / 100, method: paymentMethodLabel(row.payment_method), note: row.note || '' }))
      sheet.getRow(1).font = { bold: true }; sheet.getColumn('amount').numFmt = '#,##0.00'; sheet.autoFilter = { from: 'A1', to: 'F1' }; sheet.pageSetup.printArea = `A1:F${sheet.rowCount}`
      const buffer = await workbook.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); const link = document.createElement('a'); link.href = url; link.download = `expenses-${period}.xlsx`; link.click(); URL.revokeObjectURL(url)
    } catch (reason: any) { setError(reason.message || 'تعذر تصدير المصروفات') } finally { setBusy(false) }
  }

  if (loading) return <div className="page-loading" aria-label="جاري تحميل الاشتراكات" />
  if (!settings && error) return <AsyncState message={error} onRetry={() => window.location.reload()} />

  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><Link href="/manage" className="text-sm font-semibold text-blue-700 dark:text-blue-300">الإدارة ‹</Link><h1 className="mt-1 text-2xl font-bold text-deep-900">القسم المالي</h1><p className="mt-1 text-sm text-deep-500">الاشتراكات والمصروفات والوضع المالي للتحفيظ</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setActiveSection('expenses'); setEditingExpense(null) }} disabled={expenseCategories.every(category => !category.enabled)} className="water-btn rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">إضافة مصروف</button><button type="button" onClick={() => setShowSettings(true)} className="water-btn-outline rounded-xl px-4 py-2.5 text-sm font-semibold">إعدادات المالية</button></div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</div>}

    <section className="grid grid-cols-3 gap-2">
      {[
        ['المحصل', overview?.cash_collected_minor ?? 0, 'text-emerald-600'],
        ['المصروفات', overview?.expenses_minor ?? 0, 'text-red-600'],
        ['صافي الوضع المالي', overview?.net_cash_minor ?? 0, (overview?.net_cash_minor ?? 0) >= 0 ? 'text-blue-700' : 'text-red-600'],
      ].map(([label, value, color]) => <div key={String(label)} className="glass-card rounded-xl px-3 py-2"><p className="text-[11px] text-deep-500">{label}</p><p className={`mt-1 text-sm font-bold ${color}`}>{formatSubscriptionMoney(Number(value), currency)}</p></div>)}
    </section>

    <section className="glass-card rounded-2xl p-4">
      <h2 className="font-bold text-deep-900">التحصيل حسب طريقة الدفع</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(overview?.payment_methods || []).map(item => <div key={item.method} className="rounded-xl border border-water-200 p-3"><p className="text-sm font-bold text-deep-800">{paymentMethodLabel(item.method)}</p><p className="mt-2 text-lg font-bold text-emerald-600">{formatSubscriptionMoney(item.income_minor, currency)}</p></div>)}</div>
    </section>

    <nav className="grid grid-cols-2 rounded-2xl border border-water-200 bg-white/50 p-1 dark:bg-slate-800/50" aria-label="أقسام المالية">
      <button type="button" onClick={() => setActiveSection('subscriptions')} className={`rounded-xl px-4 py-3 text-sm font-bold ${activeSection === 'subscriptions' ? 'bg-cyan-600 text-white shadow' : 'text-deep-600'}`}>الاشتراكات</button>
      <button type="button" onClick={() => setActiveSection('expenses')} className={`rounded-xl px-4 py-3 text-sm font-bold ${activeSection === 'expenses' ? 'bg-cyan-600 text-white shadow' : 'text-deep-600'}`}>المصروفات</button>
    </nav>

    {activeSection === 'subscriptions' && <>
    {!settings?.enabled && <section className="glass-card rounded-2xl p-5"><h2 className="text-lg font-bold text-deep-900">تفعيل الاشتراكات الشهرية</h2><p className="mt-1 text-sm text-deep-500">يمكن تسجيل المصروفات دون الاشتراكات، أو تفعيل رسوم الطلاب من هنا.</p><form onSubmit={activate} className="mt-4 grid gap-3 sm:grid-cols-3"><input inputMode="decimal" required value={activationFee} onChange={event => setActivationFee(event.target.value)} placeholder="الرسم الشهري" className="surface-field rounded-xl px-4 py-2.5" /><select value={activationCurrency} onChange={event => setActivationCurrency(event.target.value)} className="surface-field rounded-xl px-4 py-2.5"><option value="EGP">EGP</option><option value="SAR">SAR</option><option value="USD">USD</option></select><button disabled={busy} className="water-btn rounded-xl px-4 py-2.5 font-bold text-white disabled:opacity-50">تفعيل الاشتراكات</button></form></section>}

    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-deep-900">اشتراكات الطلاب</h2><p className="text-sm text-deep-500">الرسوم والسداد للدورة المختارة</p></div>{settings?.enabled && <button type="button" onClick={() => setShowBulkCorrection(true)} className="water-btn-outline rounded-xl px-4 py-2 text-sm font-semibold">تصحيح رسوم الشهر جماعيًا</button>}</div>

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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-deep-500">الدورة المعروضة: {formatMonthPeriod(period.slice(0, 7), monthStartDay)}</p>{studentIdFilter && <button type="button" onClick={() => { setStudentIdFilter(undefined); setPage(1) }} className="text-xs font-semibold text-blue-700 dark:text-blue-300">عرض كل الطلاب ×</button>}</div>
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
            {record.is_paid ? <><button type="button" disabled={busy} onClick={() => void showReceipt(record)} className="water-btn-outline rounded-lg px-3 py-1.5 text-xs">الإيصال</button>{record.student_id !== null && <button type="button" disabled={busy} onClick={() => setEditingRecord(record)} className="water-btn-outline rounded-lg px-3 py-1.5 text-xs">رسوم الأشهر القادمة</button>}<button type="button" disabled={busy} onClick={() => void makeUnpaid(record)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 dark:border-red-800 dark:text-red-300">إلغاء السداد</button></> : <><button type="button" onClick={() => setEditingRecord(record)} className="water-btn-outline rounded-lg px-3 py-1.5 text-xs">تعديل الرسوم</button>{record.fee_minor > 0 && <button type="button" onClick={() => setPayingRecord(record)} className="water-btn rounded-lg px-3 py-1.5 text-xs font-bold text-white">سداد</button>}</>}
            {record.student_id !== null && <Link href={`/students/${record.student_id}`} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">ملف الطالب</Link>}
          </div>
        </article>)}
      </div>}
    </section>

    {pages > 1 && <nav className="flex items-center justify-center gap-3" aria-label="صفحات الاشتراكات"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="water-btn-outline rounded-xl px-4 py-2 text-sm disabled:opacity-40">السابق</button><span className="text-sm text-deep-600">{page} من {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage(value => value + 1)} className="water-btn-outline rounded-xl px-4 py-2 text-sm disabled:opacity-40">التالي</button></nav>}
    </>}

    {activeSection === 'expenses' && <section className="space-y-4 pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-deep-900">المصروفات</h2><p className="text-sm text-deep-500">المصروفات الفعلية للدورة المختارة</p></div><div className="flex gap-2"><button type="button" onClick={() => void exportExpenseExcel()} disabled={busy} className="water-btn-outline rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">Excel المصروفات</button><button type="button" onClick={() => setEditingExpense(null)} disabled={expenseCategories.every(category => !category.enabled)} className="water-btn rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50">إضافة مصروف</button></div></div>
      <div className="glass-card grid gap-3 rounded-2xl p-4 md:grid-cols-3"><label className="text-xs font-medium text-deep-600">التصنيف<select value={expenseCategoryFilter} onChange={event => setExpenseCategoryFilter(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-3 py-2.5 text-sm"><option value="">كل التصنيفات</option>{expenseCategories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label><label className="text-xs font-medium text-deep-600">طريقة الدفع<select value={expenseMethodFilter} onChange={event => setExpenseMethodFilter(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-3 py-2.5 text-sm"><option value="">كل الطرق</option>{SUBSCRIPTION_PAYMENT_METHODS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-xs font-medium text-deep-600">بحث<input value={expenseSearch} onChange={event => setExpenseSearch(event.target.value)} placeholder="اسم المصروف أو الملاحظة" className="surface-field mt-1 w-full rounded-xl px-3 py-2.5 text-sm" /></label></div>
      <div className="glass-card overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b border-water-200 p-4"><span className="font-bold text-deep-800">سجل المصروفات</span><span className="text-sm font-bold text-red-600">{formatSubscriptionMoney(expenses.reduce((sum, item) => sum + item.amount_minor, 0), currency)}</span></div>{expenses.length === 0 ? <div className="p-10 text-center text-sm text-deep-500">لا توجد مصروفات مطابقة.</div> : <div className="divide-y divide-water-200/60">{expenses.map(expense => <article key={expense.id} className="grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center"><div><h3 className="font-bold text-deep-900">{expense.name}</h3><p className="mt-1 text-xs text-deep-500">{expense.category_label}{expense.note ? ` · ${expense.note}` : ''}</p></div><div><p className="text-xs text-deep-500">المبلغ</p><p className="font-bold text-red-600">{formatSubscriptionMoney(expense.amount_minor, currency)}</p></div><div><p className="text-xs text-deep-500">الدفع</p><p className="text-sm text-deep-700">{expense.expense_date} · {paymentMethodLabel(expense.payment_method)}</p></div><div className="flex gap-2 md:justify-end"><button type="button" onClick={() => setEditingExpense(expense)} className="water-btn-outline rounded-lg px-3 py-1.5 text-xs">تعديل</button><button type="button" disabled={busy} onClick={() => void removeExpense(expense)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 dark:border-red-800">حذف</button></div></article>)}</div>}</div>
    </section>}

    {payingRecord && <Modal title={`سداد اشتراك — ${payingRecord.student_name}`} onClose={() => setPayingRecord(null)}><PaymentForm count={1} totalMinor={payingRecord.fee_minor} currency={currency} busy={busy} onCancel={() => setPayingRecord(null)} onSubmit={data => submitPayment([payingRecord.id], data)} /></Modal>}
    {bulkPaying && <Modal title="تسجيل سداد جماعي" onClose={() => setBulkPaying(false)}><PaymentForm count={selected.size} totalMinor={selectedTotal} currency={currency} busy={busy} onCancel={() => setBulkPaying(false)} onSubmit={data => submitPayment(Array.from(selected), data)} /></Modal>}
    {editingRecord && <Modal title={`تعديل رسوم — ${editingRecord.student_name}`} onClose={() => setEditingRecord(null)}><FeeForm record={editingRecord} currency={currency} busy={busy} onCancel={() => setEditingRecord(null)} onSubmit={saveFee} /></Modal>}
    {receipt && <ReceiptView receipt={receipt} currency={currency} onClose={() => setReceipt(null)} />}
    {editingExpense !== undefined && <Modal title={editingExpense ? `تعديل مصروف — ${editingExpense.name}` : 'إضافة مصروف'} onClose={() => setEditingExpense(undefined)} wide><ExpenseForm expense={editingExpense} categories={expenseCategories} currency={currency} busy={busy} onCancel={() => setEditingExpense(undefined)} onSubmit={saveExpense} /></Modal>}
    {showBulkCorrection && <Modal title="تصحيح رسوم شهر كامل" onClose={() => setShowBulkCorrection(false)}><BulkCorrectionForm period={period} currency={currency} busy={busy} onCancel={() => setShowBulkCorrection(false)} onSubmit={correctMonth} /></Modal>}
    {showSettings && <Modal title="إعدادات المالية" onClose={() => setShowSettings(false)} wide><form onSubmit={saveSettings} className="space-y-5">
      <section className="space-y-4">
        <div><h3 className="font-bold text-deep-900">الاشتراكات الشهرية</h3><p className="mt-1 text-xs text-deep-500">تحكم في الرسوم الافتراضية وتفعيل التحصيل.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-deep-700">الرسوم الافتراضية ({activationCurrency})<input inputMode="decimal" value={activationFee} onChange={event => setActivationFee(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5" /></label>
          <label className="block text-sm font-medium text-deep-700">العملة<select value={activationCurrency} onChange={event => setActivationCurrency(event.target.value)} className="surface-field mt-1 w-full rounded-xl px-4 py-2.5"><option value="EGP">جنيه مصري (EGP)</option><option value="SAR">ريال سعودي (SAR)</option><option value="USD">دولار أمريكي (USD)</option></select></label>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-water-200 p-3 text-sm font-medium text-deep-700"><input type="checkbox" checked={settingsEnabled} onChange={event => setSettingsEnabled(event.target.checked)} /> الاشتراكات مفعلة</label>
      </section>
      <section className="border-t border-water-200 pt-5">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-deep-900">تصنيفات المصروفات</h3><p className="mt-1 text-xs text-deep-500">عطّل التصنيف للاحتفاظ بالسجلات السابقة.</p></div><button type="button" onClick={() => setExpenseCategories(current => [...current, { id: `custom_${globalThis.crypto?.randomUUID?.().replaceAll('-', '') || Date.now()}`, label: 'تصنيف جديد', enabled: true }])} className="water-btn-outline shrink-0 rounded-lg px-3 py-2 text-xs font-semibold">إضافة</button></div>
        <div className="mt-3 grid gap-2">{expenseCategories.map((category, index) => <div key={category.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-water-200 p-2">
          <input required value={category.label} onChange={event => setExpenseCategories(current => current.map(item => item.id === category.id ? { ...item, label: event.target.value } : item))} className="surface-field min-w-36 flex-1 rounded-lg px-3 py-2 text-sm" aria-label={`اسم التصنيف ${index + 1}`} />
          <button type="button" disabled={index === 0} onClick={() => setExpenseCategories(current => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next })} className="rounded-lg border border-water-200 px-2 py-1 disabled:opacity-30" aria-label="تحريك لأعلى">↑</button>
          <button type="button" disabled={index === expenseCategories.length - 1} onClick={() => setExpenseCategories(current => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next })} className="rounded-lg border border-water-200 px-2 py-1 disabled:opacity-30" aria-label="تحريك لأسفل">↓</button>
          <label className="flex items-center gap-1 text-xs text-deep-600"><input type="checkbox" checked={category.enabled} onChange={event => setExpenseCategories(current => current.map(item => item.id === category.id ? { ...item, enabled: event.target.checked } : item))} /> مفعّل</label>
        </div>)}</div>
      </section>
      <button disabled={busy} className="water-btn w-full rounded-xl px-4 py-2.5 font-bold text-white disabled:opacity-50">{busy ? 'جاري الحفظ...' : 'حفظ إعدادات المالية'}</button>
    </form></Modal>}
  </div>
}

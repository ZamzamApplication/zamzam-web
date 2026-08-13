'use client'

import { useState } from 'react'

export const DEFAULT_ATTENDANCE_STATUSES = ['حاضر', 'غياب', 'غياب بعذر', 'لا ينطبق']
export const DEFAULT_SESSION_NAMES = ['الصباحية', 'المسائية']

export type TahfizInitialSettings = {
  attendanceStatuses: string[]
  presentStatus: string
  absentStatus: string
  sessionNames: string[]
}

export default function TahfizInitialSettingsFields({ value, onChange }: {
  value: TahfizInitialSettings
  onChange(value: TahfizInitialSettings): void
}) {
  const [newStatus, setNewStatus] = useState('')
  const [newSessionName, setNewSessionName] = useState('')

  const addStatus = () => {
    const status = newStatus.trim()
    if (!status || value.attendanceStatuses.includes(status)) return
    onChange({ ...value, attendanceStatuses: [...value.attendanceStatuses, status] })
    setNewStatus('')
  }

  const addSessionName = () => {
    const name = newSessionName.trim()
    if (!name || value.sessionNames.includes(name)) return
    onChange({ ...value, sessionNames: [...value.sessionNames, name] })
    setNewSessionName('')
  }

  return <div className="space-y-4">
    <section className="rounded-2xl border border-water-200/80 bg-white/45 p-4 dark:border-slate-700 dark:bg-slate-900/45">
      <h3 className="text-sm font-bold text-deep-900">حالات الحضور الأساسية</h3>
      <p className="mt-1 text-xs leading-5 text-deep-500">أضف الحالات التي ستستخدمها، ثم عيّن الحالة التي تعني الحضور والحالة التي تعني الغياب في النظام كله.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {value.attendanceStatuses.map(status => {
          const protectedStatus = status === value.presentStatus || status === value.absentStatus
          return <span key={status} className="inline-flex items-center gap-2 rounded-full border border-water-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-deep-700 dark:border-slate-700 dark:bg-slate-800">
            {status}
            <button type="button" disabled={protectedStatus || value.attendanceStatuses.length <= 2} onClick={() => onChange({ ...value, attendanceStatuses: value.attendanceStatuses.filter(item => item !== status) })} aria-label={`حذف ${status}`} className="text-red-500 disabled:cursor-not-allowed disabled:opacity-25">×</button>
          </span>
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={newStatus} onChange={event => setNewStatus(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addStatus() } }} maxLength={50} placeholder="إضافة حالة أخرى" className="surface-field min-w-0 flex-1 rounded-xl px-3 py-2 text-sm" />
        <button type="button" onClick={addStatus} disabled={!newStatus.trim() || value.attendanceStatuses.includes(newStatus.trim())} className="water-btn-outline rounded-xl px-4 text-xs font-semibold disabled:opacity-40">إضافة</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-deep-700">الحالة التي تعني الحضور
          <select required value={value.presentStatus} onChange={event => onChange({ ...value, presentStatus: event.target.value })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal">
            {value.attendanceStatuses.filter(status => status !== value.absentStatus).map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-deep-700">الحالة التي تعني الغياب
          <select required value={value.absentStatus} onChange={event => onChange({ ...value, absentStatus: event.target.value })} className="surface-field mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm font-normal">
            {value.attendanceStatuses.filter(status => status !== value.presentStatus).map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
    </section>

    <section className="rounded-2xl border border-water-200/80 bg-white/45 p-4 dark:border-slate-700 dark:bg-slate-900/45">
      <h3 className="text-sm font-bold text-deep-900">أسماء الحلقات</h3>
      <p className="mt-1 text-xs leading-5 text-deep-500">ستظهر كخيارات جاهزة مع تاريخ اليوم عند إنشاء حلقة.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {value.sessionNames.map(name => <span key={name} className="inline-flex items-center gap-2 rounded-full border border-water-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-deep-700 dark:border-slate-700 dark:bg-slate-800">
          {name}<button type="button" disabled={value.sessionNames.length === 1} onClick={() => onChange({ ...value, sessionNames: value.sessionNames.filter(item => item !== name) })} aria-label={`حذف ${name}`} className="text-red-500 disabled:cursor-not-allowed disabled:opacity-25">×</button>
        </span>)}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={newSessionName} onChange={event => setNewSessionName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addSessionName() } }} maxLength={50} placeholder="مثال: حلقة الفجر" className="surface-field min-w-0 flex-1 rounded-xl px-3 py-2 text-sm" />
        <button type="button" onClick={addSessionName} disabled={!newSessionName.trim() || value.sessionNames.includes(newSessionName.trim())} className="water-btn-outline rounded-xl px-4 text-xs font-semibold disabled:opacity-40">إضافة</button>
      </div>
    </section>
  </div>
}

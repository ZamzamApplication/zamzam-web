'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/format'
import { currentMonthValue, formatMonthPeriod, monthRange } from '@/lib/month'
import { formatQuranRange } from '@/lib/quran'
import { applyExcelTemplate, configuredExcelExportTemplates } from '@/lib/excel-templates'
import type { Circle, CircleAttendanceRate, QuranProgressEntry, StudentStatsItem } from '@/lib/types'
import ExcelPreviewModal, { type SpreadsheetSheet } from '@/components/ExcelPreviewModal'
import { attendanceStatusColorClass } from '@/components/AttendanceStatusControl'
import MonthSwitcher from '@/components/MonthSwitcher'
import ScrollableTable from '@/components/ScrollableTable'

export default function ReportsPage() {
  const router = useRouter()
  const [circles, setCircles] = useState<Circle[]>([])
  const [selectedCircle, setSelectedCircle] = useState<number | null>(null)
  const [circleRate, setCircleRate] = useState<CircleAttendanceRate | null>(null)
  const [studentStats, setStudentStats] = useState<StudentStatsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [periodMode, setPeriodMode] = useState<'month' | 'all'>('month')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState('')
  const [excelSheets, setExcelSheets] = useState<SpreadsheetSheet[] | null>(null)
  const [previewPic, setPreviewPic] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const reportRequestId = useRef(0)
  const [progressReport, setProgressReport] = useState<{
    enabled: boolean
    students: { student_id: number; student_name: string; entries: number; average_quality: number; mistakes: number; latest_entry: QuranProgressEntry | null }[]
    category_totals: Record<string, number>
  }>({ enabled: false, students: [], category_totals: {} })

  const studentAvatar = (name: string, profilePic?: string | null) => (
    profilePic ? (
      <img
        src={mediaUrl(profilePic)!}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-8 h-8 rounded-full object-cover border border-water-300 shrink-0 cursor-pointer hover:opacity-80 transition"
        onClick={(e) => {
          e.stopPropagation()
          setPreviewPic(mediaUrl(profilePic)!)
        }}
      />
    ) : (
      <div className="w-8 h-8 rounded-full bg-water-200/50 flex items-center justify-center text-deep-400 text-xs border border-water-300 shrink-0">
        {name.charAt(0)}
      </div>
    )
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const circlesData = await api.getCircles()
      setCircles(circlesData)
      const tahfiz = circlesData[0]
      if (tahfiz) {
        setSelectedCircle(tahfiz.id)
        const month = currentMonthValue(tahfiz.month_start_day ?? 1)
        setSelectedMonth(month)
        const range = monthRange(month, tahfiz.month_start_day ?? 1)
        await loadStatistics(tahfiz.id, range.start, range.end)
      }
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل التقارير')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const loadStatistics = async (circleId: number, from?: string, to?: string) => {
    const requestId = ++reportRequestId.current
    setReportLoading(true)
    setError('')
    try {
      const [rate, stats, progress] = await Promise.all([
        api.getCircleAttendanceRate(circleId, from, to),
        api.getCircleStudentStats(circleId, from, to),
        api.getProgressReport(from, to),
      ])
      if (requestId !== reportRequestId.current) return
      setCircleRate(rate)
      setStudentStats(stats.students)
      setProgressReport(progress)
    } catch (err: any) {
      if (requestId === reportRequestId.current) {
        setError(err.message || 'تعذر تحميل بيانات التقرير')
      }
    } finally {
      if (requestId === reportRequestId.current) {
        setReportLoading(false)
      }
    }
  }

  const handleSelectCircle = async (circleId: number | null) => {
    setSelectedCircle(circleId)
    setPeriodMode('month')
    if (!circleId) {
      setCircleRate(null)
      setStudentStats([])
      return
    }
    const monthStartDay = circles.find((circle) => circle.id === circleId)?.month_start_day ?? 1
    const range = monthRange(selectedMonth, monthStartDay)
    await loadStatistics(circleId, range.start, range.end)
  }

  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month)
    setPeriodMode('month')
    if (!selectedCircle) return
    const monthStartDay = circles.find((circle) => circle.id === selectedCircle)?.month_start_day ?? 1
    const range = monthRange(month, monthStartDay)
    await loadStatistics(selectedCircle, range.start, range.end)
  }

  const handleAllTime = async () => {
    if (!selectedCircle) return
    setPeriodMode('all')
    await loadStatistics(selectedCircle)
  }

  if (loading) return <div className="page-loading" aria-label="جاري التحميل" />

  const sortedStudents = [...studentStats].sort((a, b) =>
    a.student_name.localeCompare(b.student_name, 'ar', { sensitivity: 'base' })
  )
  const normalizedStudentSearch = studentSearch.trim().toLocaleLowerCase('ar')
  const displayStudents = sortedStudents.filter(student => (
    !normalizedStudentSearch
    || student.student_name.toLocaleLowerCase('ar').includes(normalizedStudentSearch)
    || student.sheikh_name?.toLocaleLowerCase('ar').includes(normalizedStudentSearch)
  ))
  const displayProgressStudents = progressReport?.students
    .filter(student => (
      !normalizedStudentSearch
      || student.student_name.toLocaleLowerCase('ar').includes(normalizedStudentSearch)
    ))
    .sort((a, b) => a.student_name.localeCompare(b.student_name, 'ar', { sensitivity: 'base' })) || []
  const selectedTahfiz = circles.find((circle) => circle.id === selectedCircle)
  const selectedCircleName = selectedTahfiz?.name || ''
  const monthStartDay = selectedTahfiz?.month_start_day ?? 1
  const configuredStatuses = selectedTahfiz?.attendance_statuses || []
  const observedStatuses = Object.keys(circleRate?.status_counts || {})
  const attendanceStatuses = [
    ...configuredStatuses,
    ...observedStatuses.filter((status) => !configuredStatuses.includes(status)),
  ]
  const attendanceStatusColors = selectedTahfiz?.attendance_status_colors || {}
  const statusClass = (status: string) => attendanceStatusColorClass(attendanceStatusColors[status])
  const periodLabel = periodMode === 'month'
    ? formatMonthPeriod(selectedMonth, monthStartDay)
    : 'كل الوقت'

  const openExcelPreview = () => {
    if (!circleRate) return
    const templates = configuredExcelExportTemplates(selectedTahfiz?.excel_export_templates)
    const statusColumns = attendanceStatuses.map((status, index) => ({
      id: `status_${index}`,
      label: status,
    }))
    const sheets: SpreadsheetSheet[] = [
      applyExcelTemplate({
        name: 'إحصائيات الطلاب',
        columns: [
          { id: 'student', label: 'الطالب' },
          { id: 'sheikh', label: 'الشيخ' },
          { id: 'sessions', label: 'إجمالي الحلقات' },
          ...statusColumns,
          { id: 'rate', label: 'نسبة الحضور' },
        ],
        rows: sortedStudents.map((student) => Object.fromEntries([
          ['student', student.student_name],
          ['sheikh', student.sheikh_name],
          ['sessions', student.total_sessions],
          ...attendanceStatuses.map((status, index) => [
            `status_${index}`,
            student.status_counts?.[status] || 0,
          ]),
          ['rate', `${student.attendance_rate}%`],
        ])),
      }, templates.statistics),
    ]
    if (progressReport.enabled) {
      sheets.push(applyExcelTemplate({
        name: 'تقدم الحفظ والمراجعة',
        columns: [
          { id: 'student', label: 'الطالب' },
          { id: 'entries', label: 'عدد سجلات المتابعة' },
          { id: 'quality', label: 'متوسط التقييم' },
          { id: 'mistakes', label: 'إجمالي الأخطاء' },
          { id: 'latestRange', label: 'آخر مقدار' },
        ],
        rows: progressReport.students.map((student) => ({
          student: student.student_name,
          entries: student.entries,
          quality: student.average_quality,
          mistakes: student.mistakes,
          latestRange: student.latest_entry ? formatQuranRange(student.latest_entry) : '',
        })),
      }, templates.progress))
    }
    setExcelSheets(sheets)
  }

  return (
    <div>
      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
          <button type="button" onClick={() => void load()} className="mr-2 font-semibold underline">إعادة المحاولة</button>
        </div>
      )}
      <section className="mb-6 overflow-hidden rounded-3xl border border-cyan-200/70 bg-gradient-to-bl from-cyan-50/90 via-white/70 to-water-100/60 p-5 shadow-sm dark:border-cyan-900 dark:from-cyan-950/50 dark:via-slate-900/60 dark:to-slate-900/40 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-wide text-cyan-700 dark:text-cyan-300">لوحة التحليل</p>
            <h1 className="mt-1 text-2xl font-black text-deep-900 sm:text-3xl">التقارير</h1>
            <p className="mt-2 text-sm text-deep-500">
              {selectedCircleName ? `${selectedCircleName} — ` : ''}{periodLabel}
            </p>
          </div>
          {circleRate && (
            <div className="rounded-2xl border border-cyan-200 bg-white/80 px-5 py-3 text-center shadow-sm dark:border-cyan-800 dark:bg-slate-900/70">
              <p className="text-3xl font-black text-cyan-700 dark:text-cyan-300">{circleRate.attendance_rate}%</p>
              <p className="text-xs text-deep-500">نسبة الحضور</p>
            </div>
          )}
        </div>
      </section>

      {circleRate?.scope === 'assigned_students' && (
        <div role="status" className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 dark:border-cyan-800 dark:bg-cyan-900/25 dark:text-cyan-200">
          تعرض هذه التقارير الطلاب المسندين إليك فقط.
        </div>
      )}

      {selectedCircle && (
        <div className="glass-card rounded-2xl p-5 mb-6">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => handleMonthChange(selectedMonth)}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold ${periodMode === 'month' ? 'water-btn text-white' : 'water-btn-outline'}`}
            >
              عرض شهري
            </button>
            <button
              type="button"
              onClick={handleAllTime}
              disabled={reportLoading}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${periodMode === 'all' ? 'water-btn text-white' : 'water-btn-outline'}`}
            >
              كل الوقت
            </button>
          </div>
          {periodMode === 'month' && (
            <MonthSwitcher value={selectedMonth} onChange={handleMonthChange} disabled={reportLoading} label={formatMonthPeriod(selectedMonth, monthStartDay)} />
          )}
        </div>
      )}
      {selectedCircle && (
        <label className="relative mb-6 block">
          <span className="sr-only">بحث عن طالب</span>
          <input value={studentSearch} onChange={event => setStudentSearch(event.target.value)} placeholder="ابحث باسم الطالب أو الشيخ..." className="surface-field w-full rounded-xl py-2.5 pr-4 pl-10 text-sm" />
          {studentSearch && <button type="button" onClick={() => setStudentSearch('')} aria-label="مسح البحث" className="absolute left-3 top-1/2 -translate-y-1/2 text-deep-400">×</button>}
        </label>
      )}

      {reportLoading && <div className="glass-card rounded-2xl p-6 mb-6 text-center text-deep-500">جاري تحميل الإحصائيات...</div>}

      {circleRate && !reportLoading && (
        <>
          <div className="glass-card rounded-2xl p-5 mb-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-deep-800">إحصائيات الحضور</h2>
              <p className="text-xs text-deep-500 mt-1">{periodLabel}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 text-center text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200">
                <div className="text-2xl font-black">{circleRate.total_attendance_records}</div>
                <div className="mt-1 text-xs opacity-75">إجمالي السجلات</div>
              </div>
              {attendanceStatuses.map((status) => (
                <div key={status} className={`rounded-2xl border p-4 text-center ${statusClass(status)}`}>
                  <div className="text-2xl font-black">{circleRate.status_counts?.[status] || 0}</div>
                  <div className="mt-1 truncate text-xs font-semibold">{status}</div>
                </div>
              ))}
              <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 text-center text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200">
                <div className="text-2xl font-black">{circleRate.attendance_rate}%</div>
                <div className="mt-1 text-xs opacity-75">نسبة الحضور</div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-3 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-deep-800">نسب حضور الطلاب</h2>
                <p className="text-xs text-deep-500 mt-1">{periodLabel}</p>
              </div>
              <button type="button" onClick={openExcelPreview} className="water-btn text-white rounded-xl px-4 py-2 text-sm font-semibold">
                معاينة وتصدير Excel
              </button>
            </div>
            {displayStudents.length === 0 ? (
              <div className="text-center text-deep-500 py-4">لا يوجد طلاب</div>
            ) : (<>
              <div className="md:hidden space-y-3">
                {displayStudents.map((s) => (
                  <div key={s.student_id} className="rounded-xl border border-water-200/70 bg-white/60 dark:bg-slate-800/55 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {studentAvatar(s.student_name, s.profile_pic)}
                        <div className="min-w-0">
                          <button type="button" onClick={() => router.push(`/students/${s.student_id}`)} className="block max-w-full truncate text-right font-bold text-deep-800 hover:text-cyan-700 hover:underline">{s.student_name}</button>
                          <p className="text-xs text-deep-500 truncate mt-0.5">{s.sheikh_name}</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-cyan-700 dark:text-cyan-400 shrink-0">{s.attendance_rate}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      {attendanceStatuses.map((status) => (
                        <div key={status} className={`rounded-lg border p-2 ${statusClass(status)}`}>
                          <div className="font-bold">{s.status_counts?.[status] || 0}</div>
                          <div className="truncate text-[11px] font-medium">{status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <ScrollableTable>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-water-200/30 text-deep-600">
                      <th className="text-right py-2 px-3">الطالب</th>
                      <th className="text-center py-2 px-3">الشيخ</th>
                      {attendanceStatuses.map((status) => (
                        <th key={status} className="whitespace-nowrap px-3 py-2 text-center">{status}</th>
                      ))}
                      <th className="text-center py-2 px-3">النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayStudents.map((s) => (
                        <tr key={s.student_id} className="border-b border-water-200/20 hover:bg-water-100/20">
                          <td className="py-2 px-3 text-deep-800">
                            <div className="flex items-center gap-3 min-w-[160px]">
                              {studentAvatar(s.student_name, s.profile_pic)}
                              <button type="button" onClick={() => router.push(`/students/${s.student_id}`)} className="truncate hover:text-cyan-700 hover:underline">{s.student_name}</button>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center text-deep-500">{s.sheikh_name}</td>
                          {attendanceStatuses.map((status) => (
                            <td key={status} className="px-3 py-2 text-center">
                              <span className={`inline-flex min-w-8 justify-center rounded-lg border px-2 py-1 text-xs font-bold ${statusClass(status)}`}>
                                {s.status_counts?.[status] || 0}
                              </span>
                            </td>
                          ))}
                          <td className="py-2 px-3 text-center font-bold text-cyan-700 dark:text-cyan-400">
                            {s.attendance_rate}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </ScrollableTable>
            </>)}
          </div>

          {progressReport.enabled && (
            <div className="glass-card rounded-2xl p-3 sm:p-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-deep-800">تقدم الحفظ والمراجعة</h2>
                <p className="text-xs text-deep-500 mt-1">{periodLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ['new_memorization', 'حفظ جديد'],
                  ['recent_revision', 'مراجعة قريبة'],
                  ['old_revision', 'مراجعة قديمة'],
                  ['test', 'اختبارات'],
                ].map(([key, label]) => (
                  <div key={key} className="rounded-xl bg-water-100/35 p-3 text-center">
                    <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">{progressReport.category_totals[key] || 0}</p>
                    <p className="mt-1 text-xs text-deep-500">{label}</p>
                  </div>
                ))}
              </div>
              {displayProgressStudents.length === 0 ? (
                <p className="py-6 text-center text-sm text-deep-500">لا توجد سجلات متابعة في هذه الفترة.</p>
              ) : (
                <ScrollableTable>
                  <table className="mt-4 w-full text-sm">
                    <thead><tr className="border-b border-water-200/40 text-deep-600"><th className="px-3 py-2 text-right">الطالب</th><th className="px-3 py-2 text-center">آخر مقدار</th><th className="px-3 py-2 text-center">السجلات</th><th className="px-3 py-2 text-center">متوسط التقييم</th><th className="px-3 py-2 text-center">الأخطاء</th></tr></thead>
                    <tbody>
                      {displayProgressStudents.map((student) => (
                        <tr key={student.student_id} className="border-b border-water-200/20">
                          <td className="px-3 py-2 font-medium text-deep-800"><button type="button" onClick={() => router.push(`/students/${student.student_id}`)} className="hover:text-cyan-700 hover:underline">{student.student_name}</button></td>
                          <td className="px-3 py-2 text-center text-xs text-cyan-800 dark:text-cyan-200">{student.latest_entry ? formatQuranRange(student.latest_entry) : '—'}</td>
                          <td className="px-3 py-2 text-center">{student.entries}</td>
                          <td className="px-3 py-2 text-center font-bold text-cyan-700">{student.average_quality}/5</td>
                          <td className="px-3 py-2 text-center">{student.mistakes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTable>
              )}
            </div>
          )}
        </>
      )}

      {!selectedCircle && (
        <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
          <div className="text-4xl mb-3">📊</div>
          لا توجد بيانات لعرض التقارير
        </div>
      )}

      {previewPic && <ImagePreviewModal src={previewPic} onClose={() => setPreviewPic(null)} />}
      {excelSheets && (
        <ExcelPreviewModal
          sheets={excelSheets}
          filename={`zamzam-statistics-${periodMode === 'month' ? selectedMonth : 'all-time'}.xlsx`}
          onClose={() => setExcelSheets(null)}
        />
      )}
    </div>
  )
}

function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <img src={src} alt="صورة الطالب" className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

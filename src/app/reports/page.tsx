'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/format'
import { currentMonthValue, formatMonth, monthRange } from '@/lib/month'
import type { Circle, CircleAttendanceRate, StudentStatsItem } from '@/lib/types'
import ExcelPreviewModal, { type SpreadsheetSheet } from '@/components/ExcelPreviewModal'
import MonthSwitcher from '@/components/MonthSwitcher'

export default function ReportsPage() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [selectedCircle, setSelectedCircle] = useState<number | null>(null)
  const [circleRate, setCircleRate] = useState<CircleAttendanceRate | null>(null)
  const [studentStats, setStudentStats] = useState<StudentStatsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortAsc, setSortAsc] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [periodMode, setPeriodMode] = useState<'month' | 'custom'>('month')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue)
  const [reportLoading, setReportLoading] = useState(false)
  const [excelSheets, setExcelSheets] = useState<SpreadsheetSheet[] | null>(null)
  const [previewPic, setPreviewPic] = useState<string | null>(null)

  const studentAvatar = (name: string, profilePic?: string | null) => (
    profilePic ? (
      <img
        src={mediaUrl(profilePic)!}
        alt=""
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
    const circlesData = await api.getCircles()
    setCircles(circlesData)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const loadStatistics = async (circleId: number, from?: string, to?: string) => {
    setReportLoading(true)
    try {
      const [rate, stats] = await Promise.all([
        api.getCircleAttendanceRate(circleId, from, to),
        api.getCircleStudentStats(circleId, from, to),
      ])
      setCircleRate(rate)
      setStudentStats(stats.students)
    } finally {
      setReportLoading(false)
    }
  }

  const handleSelectCircle = async (circleId: number | null) => {
    setSelectedCircle(circleId)
    setDateFrom('')
    setDateTo('')
    setPeriodMode('month')
    if (!circleId) {
      setCircleRate(null)
      setStudentStats([])
      return
    }
    const range = monthRange(selectedMonth)
    await loadStatistics(circleId, range.start, range.end)
  }

  const handleMonthChange = async (month: string) => {
    setSelectedMonth(month)
    setPeriodMode('month')
    setDateFrom('')
    setDateTo('')
    if (!selectedCircle) return
    const range = monthRange(month)
    await loadStatistics(selectedCircle, range.start, range.end)
  }

  const handleFilterByDate = async () => {
    if (!selectedCircle) return
    setPeriodMode('custom')
    await loadStatistics(selectedCircle, dateFrom || undefined, dateTo || undefined)
  }

  if (loading) return <div className="page-loading" aria-label="جاري التحميل" />

  const sortedStudents = [...studentStats].sort((a, b) => (
    sortAsc ? a.attendance_rate - b.attendance_rate : b.attendance_rate - a.attendance_rate
  ))
  const selectedCircleName = circles.find((circle) => circle.id === selectedCircle)?.name || ''
  const periodLabel = periodMode === 'month'
    ? formatMonth(selectedMonth)
    : `${dateFrom || 'البداية'} إلى ${dateTo || 'اليوم'}`

  const openExcelPreview = () => {
    if (!circleRate) return
    setExcelSheets([
      {
        name: 'الملخص',
        columns: [
          { id: 'metric', label: 'البيان' },
          { id: 'value', label: 'القيمة' },
        ],
        rows: [
          { metric: 'الحلقة', value: selectedCircleName },
          { metric: 'الفترة', value: periodLabel },
          { metric: 'إجمالي السجلات', value: circleRate.total_attendance_records },
          { metric: 'حاضر', value: circleRate.present },
          { metric: 'غياب بعذر', value: circleRate.excused },
          { metric: 'غائب', value: circleRate.absent },
          { metric: 'نسبة الحضور', value: `${circleRate.attendance_rate}%` },
        ],
      },
      {
        name: 'إحصائيات الطلاب',
        columns: [
          { id: 'student', label: 'الطالب' },
          { id: 'sheikh', label: 'الشيخ' },
          { id: 'sessions', label: 'إجمالي الجلسات' },
          { id: 'present', label: 'حاضر' },
          { id: 'excused', label: 'غياب بعذر' },
          { id: 'absent', label: 'غائب' },
          { id: 'notApplicable', label: 'لا ينطبق' },
          { id: 'rate', label: 'نسبة الحضور' },
        ],
        rows: sortedStudents.map((student) => ({
          student: student.student_name,
          sheikh: student.sheikh_name,
          sessions: student.total_sessions,
          present: student.present,
          excused: student.excused,
          absent: student.absent,
          notApplicable: student.not_applicable,
          rate: `${student.attendance_rate}%`,
        })),
      },
    ])
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-deep-800 mb-6">التقارير</h1>

      <div className="glass-card rounded-2xl p-5 mb-6">
        <label className="block text-sm font-medium text-deep-700 mb-2">اختر الحلقة</label>
        <select
          value={selectedCircle ?? ''}
          onChange={(e) => handleSelectCircle(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
        >
          <option value="">-- اختر --</option>
          {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

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
              onClick={() => {
                const range = monthRange(selectedMonth)
                setDateFrom(range.start)
                setDateTo(range.end)
                setPeriodMode('custom')
              }}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold ${periodMode === 'custom' ? 'water-btn text-white' : 'water-btn-outline'}`}
            >
              نطاق مخصص
            </button>
          </div>
          {periodMode === 'month' ? (
            <MonthSwitcher value={selectedMonth} onChange={handleMonthChange} disabled={reportLoading} />
          ) : (
          <div className="grid grid-cols-2 gap-3 items-end sm:flex">
            <div className="flex-1">
              <label className="block text-xs text-deep-500 mb-1">من</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-water-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-deep-500 mb-1">إلى</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-water-400"
              />
            </div>
            <button
              onClick={handleFilterByDate}
              className="px-4 py-2 water-btn text-white rounded-xl text-sm font-medium whitespace-nowrap"
            >
              تصفية
            </button>
            {(dateFrom || dateTo) && (
              <button
                onClick={async () => {
                  setDateFrom('')
                  setDateTo('')
                  if (!selectedCircle) return
                  await loadStatistics(selectedCircle)
                }}
                className="px-3 py-2 rounded-xl text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/30 transition whitespace-nowrap"
              >
                إلغاء
              </button>
            )}
          </div>
          )}
        </div>
      )}

      {reportLoading && <div className="glass-card rounded-2xl p-6 mb-6 text-center text-deep-500">جاري تحميل الإحصائيات...</div>}

      {circleRate && !reportLoading && (
        <>
          <div className="glass-card rounded-2xl p-5 mb-6">
            <h2 className="text-lg font-bold text-deep-800 mb-4">إحصائيات الحضور</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-water-100/30 rounded-xl">
                <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">{circleRate.total_attendance_records}</div>
                <div className="text-xs text-deep-500 mt-1">إجمالي السجلات</div>
              </div>
              <div className="text-center p-3 bg-green-100/30 dark:bg-green-900/30 rounded-xl">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{circleRate.present}</div>
                <div className="text-xs text-deep-500 mt-1">حاضر</div>
              </div>
              <div className="text-center p-3 bg-red-100/30 dark:bg-red-900/30 rounded-xl">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{circleRate.absent}</div>
                <div className="text-xs text-deep-500 mt-1">غائب</div>
              </div>
              <div className="text-center p-3 bg-yellow-100/30 dark:bg-yellow-900/30 rounded-xl">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{circleRate.excused}</div>
                <div className="text-xs text-deep-500 mt-1">غياب بعذر</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-3xl font-bold text-cyan-700 dark:text-cyan-400">
                {circleRate.attendance_rate}%
              </div>
              <div className="text-xs text-deep-500 mt-1">نسبة الحضور</div>
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
            {studentStats.length === 0 ? (
              <div className="text-center text-deep-500 py-4">لا يوجد طلاب</div>
            ) : (<>
              <div className="md:hidden space-y-3">
                <button
                  type="button"
                  onClick={() => setSortAsc(!sortAsc)}
                  className="w-full water-btn-outline rounded-xl px-4 py-2 text-sm font-medium"
                >
                  ترتيب حسب النسبة {sortAsc ? 'من الأقل للأعلى ↑' : 'من الأعلى للأقل ↓'}
                </button>
                {sortedStudents.map((s) => (
                  <div key={s.student_id} className="rounded-xl border border-water-200/70 bg-white/60 dark:bg-slate-800/55 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {studentAvatar(s.student_name, s.profile_pic)}
                        <div className="min-w-0">
                          <p className="font-bold text-deep-800 truncate">{s.student_name}</p>
                          <p className="text-xs text-deep-500 truncate mt-0.5">{s.sheikh_name}</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-cyan-700 dark:text-cyan-400 shrink-0">{s.attendance_rate}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-green-50/80 dark:bg-green-900/25 p-2">
                        <div className="font-bold text-green-700 dark:text-green-400">{s.present}</div>
                        <div className="text-[11px] text-deep-500">حضر</div>
                      </div>
                      <div className="rounded-lg bg-yellow-50/80 dark:bg-yellow-900/25 p-2">
                        <div className="font-bold text-yellow-700 dark:text-yellow-400">{s.excused}</div>
                        <div className="text-[11px] text-deep-500">بعذر</div>
                      </div>
                      <div className="rounded-lg bg-red-50/80 dark:bg-red-900/25 p-2">
                        <div className="font-bold text-red-600 dark:text-red-400">{s.absent}</div>
                        <div className="text-[11px] text-deep-500">غاب</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-water-200/30 text-deep-600">
                      <th className="text-right py-2 px-3">الطالب</th>
                      <th className="text-center py-2 px-3">الشيخ</th>
                      <th className="text-center py-2 px-3">حضر</th>
                      <th className="text-center py-2 px-3">بعذر</th>
                      <th className="text-center py-2 px-3">غاب</th>
                      <th className="text-center py-2 px-3">
                        <button onClick={() => setSortAsc(!sortAsc)} className="hover:text-cyan-700 transition cursor-pointer">
                          النسبة {sortAsc ? '↑' : '↓'}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map((s) => (
                        <tr key={s.student_id} className="border-b border-water-200/20 hover:bg-water-100/20">
                          <td className="py-2 px-3 text-deep-800">
                            <div className="flex items-center gap-3 min-w-[160px]">
                              {studentAvatar(s.student_name, s.profile_pic)}
                              <span className="truncate">{s.student_name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center text-deep-500">{s.sheikh_name}</td>
                          <td className="py-2 px-3 text-center text-green-700 dark:text-green-400">{s.present}</td>
                          <td className="py-2 px-3 text-center text-yellow-700 dark:text-yellow-400">{s.excused}</td>
                          <td className="py-2 px-3 text-center text-red-600 dark:text-red-400">{s.absent}</td>
                          <td className="py-2 px-3 text-center font-bold text-cyan-700 dark:text-cyan-400">
                            {s.attendance_rate}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>)}
          </div>
        </>
      )}

      {!selectedCircle && (
        <div className="glass-card rounded-2xl p-8 text-center text-deep-600/60">
          <div className="text-4xl mb-3">📊</div>
          اختر حلقة لعرض التقارير
        </div>
      )}

      {previewPic && <ImagePreviewModal src={previewPic} onClose={() => setPreviewPic(null)} />}
      {excelSheets && (
        <ExcelPreviewModal
          sheets={excelSheets}
          filename={`zamzam-statistics-${selectedMonth}.xlsx`}
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

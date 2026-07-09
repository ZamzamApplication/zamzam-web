'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/format'
import type { Circle, CircleAttendanceRate, StudentStatsItem } from '@/lib/types'

export default function ReportsPage() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [selectedCircle, setSelectedCircle] = useState<number | null>(null)
  const [circleRate, setCircleRate] = useState<CircleAttendanceRate | null>(null)
  const [studentStats, setStudentStats] = useState<StudentStatsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortAsc, setSortAsc] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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

  const handleSelectCircle = async (circleId: number) => {
    setSelectedCircle(circleId)
    setDateFrom('')
    setDateTo('')

    const [rate, stats] = await Promise.all([
      api.getCircleAttendanceRate(circleId),
      api.getCircleStudentStats(circleId),
    ])
    setCircleRate(rate)
    setStudentStats(stats.students)
  }

  const handleFilterByDate = async () => {
    if (!selectedCircle) return
    const df = dateFrom || undefined
    const dt = dateTo || undefined
    const [rate, stats] = await Promise.all([
      api.getCircleAttendanceRate(selectedCircle, df, dt),
      api.getCircleStudentStats(selectedCircle, df, dt),
    ])
    setCircleRate(rate)
    setStudentStats(stats.students)
  }

  if (loading) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-deep-800 mb-6">التقارير</h1>

      <div className="glass-card rounded-2xl p-5 mb-6">
        <label className="block text-sm font-medium text-deep-700 mb-2">اختر الحلقة</label>
        <select
          value={selectedCircle ?? ''}
          onChange={(e) => handleSelectCircle(Number(e.target.value))}
          className="w-full px-4 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-water-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-water-400"
        >
          <option value="">-- اختر --</option>
          {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {selectedCircle && (
        <div className="glass-card rounded-2xl p-5 mb-6">
          <label className="block text-sm font-medium text-deep-700 mb-2">نطاق التاريخ</label>
          <div className="flex gap-3 items-end">
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
                  const [rate, stats] = await Promise.all([
                    api.getCircleAttendanceRate(selectedCircle),
                    api.getCircleStudentStats(selectedCircle),
                  ])
                  setCircleRate(rate)
                  setStudentStats(stats.students)
                }}
                className="px-3 py-2 rounded-xl text-sm border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/30 transition whitespace-nowrap"
              >
                إلغاء
              </button>
            )}
          </div>
        </div>
      )}

      {circleRate && (
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

          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-lg font-bold text-deep-800 mb-4">نسب حضور الطلاب</h2>
            {studentStats.length === 0 ? (
              <div className="text-center text-deep-500 py-4">لا يوجد طلاب</div>
            ) : (
              <div className="overflow-x-auto">
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
                    {[...studentStats]
                      .sort((a, b) => sortAsc ? a.attendance_rate - b.attendance_rate : b.attendance_rate - a.attendance_rate)
                      .map((s) => (
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
            )}
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

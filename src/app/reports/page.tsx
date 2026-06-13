'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Circle, CircleAttendanceRate, SheikhInfo, StudentInfo, StudentStreak } from '@/lib/types'

export default function ReportsPage() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [sheikhs, setSheikhs] = useState<SheikhInfo[]>([])
  const [selectedCircle, setSelectedCircle] = useState<number | null>(null)
  const [circleRate, setCircleRate] = useState<CircleAttendanceRate | null>(null)
  const [students, setStudents] = useState<Record<number, StudentInfo>>({})
  const [studentSheikhMap, setStudentSheikhMap] = useState<Record<number, string>>({})
  const [studentStreaks, setStudentStreaks] = useState<Record<number, StudentStreak>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [circlesData, sheikhsData] = await Promise.all([
      api.getCircles(),
      api.getSheikhs(),
    ])
    setCircles(circlesData)
    setSheikhs(sheikhsData)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSelectCircle = async (circleId: number) => {
    setSelectedCircle(circleId)

    const [rate, _sheikhs] = await Promise.all([
      api.getCircleAttendanceRate(circleId),
      api.getSheikhs(),
    ])
    setCircleRate(rate)
    setSheikhs(_sheikhs)

    const circleSheikhs = _sheikhs.filter((s: SheikhInfo) => s.circle_id === circleId)
    const studentMap: Record<number, StudentInfo> = {}
    const sheikhNameMap: Record<number, string> = {}

    for (const sh of circleSheikhs) {
      const studentList = await api.getSheikhStudents(sh.id)
      for (const st of studentList) {
        studentMap[st.id] = st
        sheikhNameMap[st.id] = sh.name
      }
    }
    setStudents(studentMap)
    setStudentSheikhMap(sheikhNameMap)

    const streaks: Record<number, StudentStreak> = {}
    for (const stId of Object.keys(studentMap)) {
      const streak = await api.getStudentStreak(Number(stId))
      streaks[Number(stId)] = streak
    }
    setStudentStreaks(streaks)
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
              <div className="text-3xl font-bold text-cyan-700 dark:text-cyan-400">{circleRate.attendance_rate}%</div>
              <div className="text-xs text-deep-500 mt-1">نسبة الحضور</div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-lg font-bold text-deep-800 mb-4">نسب حضور الطلاب</h2>
            {Object.keys(studentStreaks).length === 0 ? (
              <div className="text-center text-deep-500 py-4">لا يوجد طلاب</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-water-200/30 text-deep-600">
                      <th className="text-right py-2 px-3">الطالب</th>
                      <th className="text-center py-2 px-3">الشيخ</th>
                      <th className="text-center py-2 px-3">حضر</th>
                      <th className="text-center py-2 px-3">غاب</th>
                      <th className="text-center py-2 px-3">النسبة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(studentStreaks)
                      .sort(([, a], [, b]) => b.attendance_rate - a.attendance_rate)
                      .map(([studentId, streak]) => {
                        const sid = Number(studentId)
                        const student = students[sid]
                        return (
                          <tr key={studentId} className="border-b border-water-200/20 hover:bg-water-100/20">
                            <td className="py-2 px-3 text-deep-800">{student?.name || `#${studentId}`}</td>
                            <td className="py-2 px-3 text-center text-deep-500">{studentSheikhMap[sid] || ''}</td>
                            <td className="py-2 px-3 text-center text-green-700 dark:text-green-400">{streak.total_attended}</td>
                            <td className="py-2 px-3 text-center text-red-600 dark:text-red-400">{streak.total_absent}</td>
                            <td className="py-2 px-3 text-center font-bold text-cyan-700 dark:text-cyan-400">{streak.attendance_rate}%</td>
                          </tr>
                        )
                      })}
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
    </div>
  )
}

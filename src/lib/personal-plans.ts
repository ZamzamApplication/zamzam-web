import { request } from './api'
import { generateQuranPlan, type QuranPlanTrack } from './quran-plan'

export type ShareMode = 'private' | 'readonly' | 'read_mark'
export type PlanConfiguration = {
  planOwnerType: 'student' | 'female-student' | 'teacher' | 'female-teacher'
  studentName: string
  startDate: string
  endDate: string
  weekdays: number[]
  includeCompletionCheckboxes: boolean
  tracks: QuranPlanTrack[]
}
export type SavedPlanSummary = {
  id: string
  name: string
  completed: boolean
  archived: boolean
  share_mode: ShareMode
  share_token?: string | null
  version: number
  created_at: string
  updated_at: string
  can_edit: boolean
  can_mark: boolean
  completed_dates: string[]
  study_dates: string[]
}
export type SavedPlan = SavedPlanSummary & { configuration: PlanConfiguration }

async function sharedRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/shared-plans/${path}`, {
    ...options, credentials: 'omit', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    const error = new Error(response.status === 409 ? 'الخطة تغيرت. أعد فتحها قبل الحفظ.' : response.status === 404 ? 'الرابط غير متاح أو ألغاه صاحب الخطة.' : 'تعذر تحديث الخطة.') as Error & { status: number }
    error.status = response.status
    throw error
  }
  return response.json()
}

export function retainedCompletionDates(previous: PlanConfiguration | undefined, next: PlanConfiguration, completed: string[]): string[] {
  const after = generateQuranPlan(next)
  if (!previous) return completed.filter(date => after.days.some(day => day.date === date && day.isStudyDay))
  const before = generateQuranPlan(previous)
  const dates = new Map(before.days.map(day => [day.date, day]))
  return completed.filter(date => {
    const oldDay = dates.get(date)
    const newDay = after.days.find(day => day.date === date)
    return oldDay?.isStudyDay && newDay?.isStudyDay
      && JSON.stringify(oldDay.assignments) === JSON.stringify(newDay.assignments)
      && JSON.stringify(oldDay.paused) === JSON.stringify(newDay.paused)
  })
}

export const personalPlans = {
  list: () => request<SavedPlanSummary[]>('/personal-plans'),
  get: (id: string) => request<SavedPlan>(`/personal-plans/${encodeURIComponent(id)}`),
  save: (data: { name: string; configuration: PlanConfiguration; study_dates: string[]; completed_dates: string[] }, previous?: SavedPlan) => request<SavedPlan>(previous ? `/personal-plans/${previous.id}` : '/personal-plans', {
    method: previous ? 'PUT' : 'POST', body: JSON.stringify({ ...data, ...(previous ? { expected_version: previous.version } : {}) }),
  }),
  status: (plan: SavedPlanSummary, changes: { completed?: boolean; archived?: boolean; share_mode?: ShareMode }) => request<SavedPlan>(`/personal-plans/${plan.id}`, {
    method: 'PATCH', body: JSON.stringify({ expected_version: plan.version, ...changes }),
  }),
  remove: (plan: SavedPlanSummary) => request<void>(`/personal-plans/${plan.id}?expected_version=${plan.version}`, { method: 'DELETE' }),
  shared: (token: string) => sharedRequest<SavedPlan>(encodeURIComponent(token)),
  mark: (plan: SavedPlan, date: string, done: boolean, token?: string) => token
    ? sharedRequest<SavedPlan>(`${encodeURIComponent(token)}/progress`, { method: 'PATCH', body: JSON.stringify({ date, done, expected_version: plan.version }) })
    : request<SavedPlan>(`/personal-plans/${plan.id}/progress`, { method: 'PATCH', body: JSON.stringify({ date, done, expected_version: plan.version }) }),
}

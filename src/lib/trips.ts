export interface Trip {
  id: number
  name: string
  date: string
  destination: string
  meeting_point: string
  departure_time: string
  fee_minor: number
  currency: 'EGP' | 'SAR' | 'USD'
  notes: string
  status: 'planned' | 'completed'
  version: number
  updated_at: string
  participant_count?: number
}

export type TripInput = Pick<Trip, 'name' | 'date' | 'destination' | 'meeting_point' | 'departure_time' | 'fee_minor' | 'currency' | 'notes'>
export interface TripStudent { id: number; name: string; phone: string; student_code: string; sheikh_name: string }
export interface TripParticipant extends Omit<TripStudent, 'id'> {
  id: number
  student_id: number | null
  group_id: number | null
  guardian_id: number | null
  is_adult: boolean
  kind: 'student' | 'guest'
  fee_minor: number
  paid_minor: number
  active: boolean
  payment_exempt: boolean
  exemption_reason: string
  notes: string
  version: number
}
export type CheckStatus = 'pending' | 'present' | 'absent'
export interface TripGroup { id: number; name: string }
export interface TripCheck { participant_id: number; group_id: number | null; status: CheckStatus; checked_at: string | null; version: number }
export interface TripRound { id: number; title: string; created_at: string; closed_at: string | null }
export interface TripDetail {
  trip: Trip
  groups: TripGroup[]
  participants: TripParticipant[]
  rounds: TripRound[]
  selected_round_id: number | null
  checks: TripCheck[]
}

export function normalizeTripSearch(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\s()+-]+/g, ' ').trim()
}

export function matchesTripSearch(person: Pick<TripStudent, 'name' | 'phone' | 'student_code' | 'sheikh_name'>, query: string): boolean {
  const searchable = normalizeTripSearch([person.name, person.phone, person.phone.replace(/\D/g, ''), person.student_code, person.sheikh_name].join(' '))
  return normalizeTripSearch(query).split(/\s+/).filter(Boolean).every(term => searchable.includes(term))
}

export function tripPaymentStatus(person: Pick<TripParticipant, 'fee_minor' | 'paid_minor' | 'payment_exempt'>): 'paid' | 'partial' | 'unpaid' | 'exempt' {
  if (person.payment_exempt) return 'exempt'
  return person.paid_minor >= person.fee_minor ? 'paid' : person.paid_minor > 0 ? 'partial' : 'unpaid'
}

export function parseTripMoney(value: string): number | null {
  const normalized = value.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660)).replace('٫', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const [whole, fraction = ''] = normalized.split('.')
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(amount) && amount <= 100_000_000 ? amount : null
}

export function tripMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount / 100)
}

export function tripTime(value: string): string {
  return new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).format(new Date(value.endsWith('Z') ? value : `${value}Z`))
}

export function tripHeadcount(checks: TripCheck[], group: string = 'all') {
  const scoped = checks.filter(check => group === 'all' || (group === 'none' ? check.group_id === null : check.group_id === Number(group)))
  const present = scoped.filter(check => check.status === 'present').length
  const pending = scoped.filter(check => check.status === 'pending').length
  const absent = scoped.filter(check => check.status === 'absent').length
  return { expected: scoped.length, present, pending, absent, unconfirmed: pending + absent, allPresent: scoped.length > 0 && present === scoped.length }
}

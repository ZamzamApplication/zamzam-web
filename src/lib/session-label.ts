type SessionLabelInput = {
  id?: number
  date?: string
  name?: string | null
  daily_sequence?: number
}

export function sessionDescriptor(session: SessionLabelInput, hasMultipleSessions?: boolean): string {
  const name = session.name?.trim()
  if (name) return name
  const shouldShowSequence = hasMultipleSessions ?? (session.daily_sequence || 1) > 1
  if (shouldShowSequence) {
    return `جلسة ${session.daily_sequence || 1}`
  }
  return ''
}

export function sessionDateLabel(
  session: SessionLabelInput & { date: string },
  formatDate: (date: string) => string,
  hasMultipleSessions?: boolean,
): string {
  const descriptor = sessionDescriptor(session, hasMultipleSessions)
  return descriptor ? `${formatDate(session.date)} — ${descriptor}` : formatDate(session.date)
}

export function sessionDateLabelFromCollection(
  session: SessionLabelInput & { date: string },
  sessions: SessionLabelInput[],
  formatDate: (date: string) => string,
): string {
  const sameDayCount = sessions.filter((candidate) => candidate.date === session.date).length
  return sessionDateLabel(session, formatDate, sameDayCount > 1)
}

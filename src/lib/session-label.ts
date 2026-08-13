export function sessionDescriptor(session: { name?: string | null; daily_sequence?: number }): string {
  const name = session.name?.trim()
  if (name) return name
  return `جلسة ${session.daily_sequence || 1}`
}

export function sessionDateLabel(
  session: { date: string; name?: string | null; daily_sequence?: number },
  formatDate: (date: string) => string,
): string {
  return `${formatDate(session.date)} — ${sessionDescriptor(session)}`
}

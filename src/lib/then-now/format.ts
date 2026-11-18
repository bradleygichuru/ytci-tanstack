const DATE_TIME = new Intl.DateTimeFormat('en-KE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Nairobi',
})

const DATE_ONLY = new Intl.DateTimeFormat('en-KE', {
  dateStyle: 'medium',
  timeZone: 'Africa/Nairobi',
})

export function nowIso(): string {
  return new Date().toISOString()
}

export function formatEat(iso: string | undefined): string {
  if (!iso) return 'Not set'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return DATE_TIME.format(date)
}

export function formatDateEat(iso: string | undefined): string {
  if (!iso) return 'Not set'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return DATE_ONLY.format(date)
}

export function relativeAge(iso: string | undefined): string {
  if (!iso) return 'Just now'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function todayEatDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isoAtEat(date: string, time: string): string {
  const parsed = new Date(`${date}T${time}:00+03:00`)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

// Formatting helpers. Ghana is on GMT (UTC+0) year-round with no DST, so the
// browser's local time is correct for users in-country and these need no
// timezone juggling.

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * "4 min ago" / "2 h ago". During an active event the age of a reading matters
 * as much as its value — a calm number from 90 minutes ago is not reassuring.
 */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  if (diff < 0) return 'just now'
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} h ago`
  return `${Math.floor(diff / DAY)} d ago`
}

/** Flags readings old enough to be suspect, matching the offline threshold. */
export function isStale(iso: string, maxAgeMs: number, now: number = Date.now()): boolean {
  return now - new Date(iso).getTime() > maxAgeMs
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

/** "12 Aug, 14:30" — the format used in the alert feed. */
export function dateTime(iso: string): string {
  return `${shortDate(iso)}, ${clockTime(iso)}`
}

/** ISO date only (YYYY-MM-DD), for date-range inputs. */
export function isoDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().slice(0, 10)
}

export function num(n: number): string {
  return n.toLocaleString('en-GB')
}

/** Pluralise without dragging in a dependency. */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${num(n)} ${n === 1 ? one : many}`
}

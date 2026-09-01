import type { Coverage, DeliveryStatus, NodeStatus, RiskLevel } from '../types'

/**
 * One source of truth for what each status looks like and is called.
 *
 * Colour alone is not a status indicator — roughly 1 in 12 men has some form
 * of colour blindness, and this gets read on a glare-washed tablet screen in
 * the field. Every status therefore carries a text label everywhere it
 * appears, and red/amber/green are paired with distinct shapes on the map.
 */
export interface StatusStyle {
  label: string
  /** Short form for dense contexts like table cells and map tooltips. */
  short: string
  /** Raw hex, for Leaflet and Recharts, which take colours as strings. */
  hex: string
  /** Tailwind classes for a filled badge. */
  badge: string
  /** Tailwind classes for a subtle tinted surface. */
  surface: string
  dot: string
}

export const RISK: Record<NodeStatus, StatusStyle> = {
  normal: {
    label: 'Normal',
    short: 'Normal',
    hex: '#10b981',
    badge: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40',
    surface: 'bg-emerald-500/5 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  watch: {
    label: 'Elevated — watch',
    short: 'Watch',
    hex: '#f59e0b',
    badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40',
    surface: 'bg-amber-500/5 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  critical: {
    label: 'Critical — flood risk',
    short: 'Critical',
    hex: '#ef4444',
    badge: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/40',
    surface: 'bg-red-500/5 border-red-500/30',
    dot: 'bg-red-400',
  },
  offline: {
    label: 'Offline — not reporting',
    short: 'Offline',
    hex: '#64748b',
    badge: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/40',
    surface: 'bg-slate-500/5 border-slate-500/30',
    dot: 'bg-slate-400',
  },
}

export const COVERAGE: Record<Coverage, { label: string; hex: string; badge: string }> = {
  live: {
    label: 'Live coverage',
    hex: '#38bdf8',
    badge: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40',
  },
  planned: {
    label: 'Planned coverage',
    hex: '#818cf8',
    badge: 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40',
  },
}

export const DELIVERY: Record<DeliveryStatus, { label: string; badge: string }> = {
  delivered: {
    label: 'Delivered',
    badge: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40',
  },
  sent: {
    label: 'Sent',
    badge: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40',
  },
  failed: {
    label: 'Failed',
    badge: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/40',
  },
}

/** Severity order, used for sorting and for picking the worst status in a set. */
const SEVERITY: Record<NodeStatus, number> = {
  normal: 0,
  offline: 1,
  watch: 2,
  critical: 3,
}

export function severity(status: NodeStatus): number {
  return SEVERITY[status]
}

/** The most severe status in a list — how a community rolls up its nodes. */
export function worstStatus(statuses: NodeStatus[]): NodeStatus {
  return statuses.reduce<NodeStatus>(
    (worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst),
    'normal',
  )
}

export const RISK_ORDER: RiskLevel[] = ['critical', 'watch', 'normal']

/** True when a community needs someone to act on it right now. */
export function isActionable(level: RiskLevel): boolean {
  return level === 'watch' || level === 'critical'
}

/**
 * Recommended actions per risk level. Static for now, by design — a fixed
 * checklist that a coordinator can work top to bottom beats a clever one that
 * nobody trusts. Replace with NADMO's own SOP text when it's available.
 */
export const ACTION_CHECKLIST: Record<RiskLevel, string[]> = {
  normal: [
    'No action required — continue routine monitoring',
    'Confirm node battery levels are above 40%',
  ],
  watch: [
    'Notify the district NADMO coordinator',
    'Confirm the assembly point is accessible and unlocked',
    'Put the community volunteer team on standby',
    'Verify SMS alert reached recipients (check delivery status)',
    'Re-check water level readings every 30 minutes',
  ],
  critical: [
    'Call the district NADMO coordinator immediately',
    'Open the designated shelter and staff it',
    'Prepare and clear the evacuation route',
    'Alert the nearby health facility to expect casualties',
    'Dispatch the community volunteer team to at-risk households',
    'Notify Ghana Police Service and Fire Service district commands',
    'Escalate to Regional NADMO if water level keeps rising',
  ],
}

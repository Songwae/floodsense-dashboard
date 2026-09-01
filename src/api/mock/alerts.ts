import type { Alert, DeliveryStatus, RiskLevel } from '../../types'
import { HOUR_MS, NOW_HOUR, hashSeed, rng } from './seed'
import { communityById } from './communities'

// Simulated SMS alert history for the live communities.
//
// Recipient counts are a share of each community's registered households, not
// every household — SMS reach depends on who has actually enrolled a number.
// Delivery outcomes include failures on purpose: an alerting system that never
// reports a failure is one nobody has checked.

const HISTORY_DAYS = 14

/** Alerts, newest first, so the feed can render without re-sorting. */
function generate(): Alert[] {
  const out: Alert[] = []

  const schedule: { communityId: string; hoursAgo: number; level: RiskLevel }[] = [
    // Adenta's current elevated episode — the storm that ended three hours ago.
    { communityId: 'adenta', hoursAgo: 2, level: 'watch' },
    { communityId: 'adenta', hoursAgo: 6, level: 'watch' },
    { communityId: 'adenta', hoursAgo: 19, level: 'normal' },
    // Earlier in the fortnight.
    { communityId: 'adenta', hoursAgo: 31, level: 'watch' },
    { communityId: 'madina', hoursAgo: 34, level: 'watch' },
    { communityId: 'adenta', hoursAgo: 52, level: 'critical' },
    { communityId: 'adenta', hoursAgo: 55, level: 'watch' },
    { communityId: 'madina', hoursAgo: 58, level: 'watch' },
    { communityId: 'adenta', hoursAgo: 77, level: 'normal' },
    { communityId: 'madina', hoursAgo: 81, level: 'normal' },
    { communityId: 'adenta', hoursAgo: 96, level: 'watch' },
    { communityId: 'madina', hoursAgo: 103, level: 'watch' },
    { communityId: 'adenta', hoursAgo: 124, level: 'watch' },
    { communityId: 'madina', hoursAgo: 130, level: 'normal' },
    { communityId: 'adenta', hoursAgo: 149, level: 'critical' },
    { communityId: 'madina', hoursAgo: 152, level: 'watch' },
    { communityId: 'adenta', hoursAgo: 155, level: 'watch' },
    { communityId: 'adenta', hoursAgo: 178, level: 'normal' },
    { communityId: 'madina', hoursAgo: 194, level: 'watch' },
    { communityId: 'adenta', hoursAgo: 201, level: 'watch' },
    { communityId: 'madina', hoursAgo: 223, level: 'normal' },
    { communityId: 'adenta', hoursAgo: 244, level: 'watch' },
    { communityId: 'adenta', hoursAgo: 248, level: 'watch' },
    { communityId: 'madina', hoursAgo: 266, level: 'watch' },
    { communityId: 'adenta', hoursAgo: 289, level: 'normal' },
    { communityId: 'madina', hoursAgo: 295, level: 'normal' },
    { communityId: 'adenta', hoursAgo: 312, level: 'watch' },
    { communityId: 'madina', hoursAgo: 320, level: 'watch' },
  ]

  const plan = schedule.filter((p) => p.hoursAgo <= HISTORY_DAYS * 24)

  const triggerFor: Record<RiskLevel, string[]> = {
    normal: ['Levels receded below watch threshold', 'All-clear issued for the zone'],
    watch: [
      'Water level crossed watch threshold',
      'Sustained rainfall over the catchment',
      'Rising trend detected across two nodes',
    ],
    critical: [
      'Water level crossed critical threshold',
      'Rapid rise sustained over 90 minutes',
    ],
  }

  plan.forEach((p, i) => {
    const community = communityById.get(p.communityId)
    if (!community) return

    const r = rng(hashSeed(`alert:${p.communityId}:${p.hoursAgo}:${i}`))

    // Reach grows with severity — critical alerts go to the full enrolled list,
    // routine ones to the standing subscriber group.
    const reachShare = p.level === 'critical' ? 0.94 : p.level === 'watch' ? 0.82 : 0.7
    const recipients = Math.round(community.households * reachShare * (0.94 + r() * 0.12))

    // Most messages land; a minority stall on the carrier or bounce off dead
    // handsets. Recent ones may still be in flight.
    const roll = r()
    let delivery: DeliveryStatus
    if (p.hoursAgo < 3 && roll < 0.55) delivery = 'sent'
    else if (roll < 0.08) delivery = 'failed'
    else if (roll < 0.16) delivery = 'sent'
    else delivery = 'delivered'

    const triggers = triggerFor[p.level]

    out.push({
      id: `ALT-${String(plan.length - i).padStart(4, '0')}`,
      community_id: p.communityId,
      timestamp: new Date(NOW_HOUR - p.hoursAgo * HOUR_MS).toISOString(),
      risk_level: p.level,
      recipients_count: recipients,
      delivery_status: delivery,
      trigger: triggers[Math.floor(r() * triggers.length)],
    })
  })

  return out.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}

export const alerts = generate()

/**
 * An alert counts as "active" while it is recent enough that people are still
 * acting on it. Twelve hours is a working assumption, not a NADMO standard.
 */
export const ACTIVE_ALERT_WINDOW_MS = 12 * HOUR_MS

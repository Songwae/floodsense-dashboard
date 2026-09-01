import type { Node, NodeStatus, Reading } from '../../types'
import { HOUR_MS, NOW_HOUR, hashSeed, offsetKm, rng } from './seed'
import { communityById } from './communities'

// The simulated sensor network: where the nodes are, and what they measured.
//
// Node site names are descriptive placeholders for real installation points.
// Water levels are synthetic — generated from a simple rainfall-response model
// (storm -> sharp rise -> exponential recession) so the hydrographs behave the
// way a drain actually behaves rather than looking like random noise. They are
// NOT model output and carry no predictive meaning.

/** Nodes report hourly; three missed reports and we call it offline. */
export const NODE_OFFLINE_AFTER_MS = 3 * HOUR_MS

/** How much history the mock generates. The UI never asks for more than this. */
const HISTORY_DAYS = 30
const HISTORY_HOURS = HISTORY_DAYS * 24

interface NodeSeed {
  id: string
  community_id: string
  name: string
  /** Position as an offset from the community centre, in km (north, east). */
  dNorthKm: number
  dEastKm: number
  /** Dry-weather baseline water level for this drain. */
  baseCm: number
  threshold_watch_cm: number
  threshold_critical_cm: number
  /**
   * Where this node's level should land at "now". The generated series is
   * ramped toward this over its final hours so the demo opens in a known,
   * describable state instead of wherever the noise happened to leave it.
   */
  targetNowCm: number
  battery_pct: number
  solar_charging: boolean | null
  hasRainGauge: boolean
  /** Set when the node has stopped reporting; hours since its last check-in. */
  offlineForHours?: number
}

const NODE_SEEDS: NodeSeed[] = [
  // --- Adenta: opens in "watch" — one node elevated after recent rain -------
  {
    id: 'ADT-01',
    community_id: 'adenta',
    name: 'Adenta Barrier Culvert',
    dNorthKm: 0.6,
    dEastKm: -0.5,
    baseCm: 95,
    threshold_watch_cm: 160,
    threshold_critical_cm: 215,
    targetNowCm: 138,
    battery_pct: 86,
    solar_charging: true,
    hasRainGauge: true,
  },
  {
    id: 'ADT-02',
    community_id: 'adenta',
    name: 'Adenta Housing Down Main Drain',
    dNorthKm: -0.4,
    dEastKm: 0.7,
    baseCm: 110,
    threshold_watch_cm: 180,
    threshold_critical_cm: 240,
    targetNowCm: 198, // above watch, below critical — drives the demo state
    battery_pct: 74,
    solar_charging: true,
    hasRainGauge: false,
  },
  {
    id: 'ADT-03',
    community_id: 'adenta',
    name: 'Adenta SDA Junction Drain',
    dNorthKm: -0.9,
    dEastKm: -0.8,
    baseCm: 78,
    threshold_watch_cm: 145,
    threshold_critical_cm: 200,
    targetNowCm: 104,
    battery_pct: 91,
    solar_charging: true,
    hasRainGauge: false,
  },
  {
    id: 'ADT-04',
    community_id: 'adenta',
    name: 'Adenta Frafraha Feeder Drain',
    dNorthKm: 1.1,
    dEastKm: 0.9,
    baseCm: 65,
    threshold_watch_cm: 130,
    threshold_critical_cm: 185,
    targetNowCm: 88,
    battery_pct: 9, // flat battery is why it went quiet
    solar_charging: false,
    hasRainGauge: false,
    offlineForHours: 14,
  },

  // --- Madina: opens "normal" ----------------------------------------------
  {
    id: 'MAD-01',
    community_id: 'madina',
    name: 'Madina Zongo Junction Drain',
    dNorthKm: 0.5,
    dEastKm: 0.6,
    baseCm: 88,
    threshold_watch_cm: 155,
    threshold_critical_cm: 210,
    targetNowCm: 97,
    battery_pct: 93,
    solar_charging: true,
    hasRainGauge: true,
  },
  {
    id: 'MAD-02',
    community_id: 'madina',
    name: 'Madina Market Storm Drain',
    dNorthKm: -0.6,
    dEastKm: -0.4,
    baseCm: 102,
    threshold_watch_cm: 170,
    threshold_critical_cm: 225,
    targetNowCm: 118,
    battery_pct: 68,
    solar_charging: true,
    hasRainGauge: false,
  },
  {
    id: 'MAD-03',
    community_id: 'madina',
    name: 'Madina Ritz Junction Culvert',
    dNorthKm: -0.2,
    dEastKm: 0.9,
    baseCm: 71,
    threshold_watch_cm: 140,
    threshold_critical_cm: 195,
    targetNowCm: 79,
    battery_pct: 55,
    solar_charging: null, // mains-backed unit, no panel fitted
    hasRainGauge: false,
  },
]

// --- Rainfall ---------------------------------------------------------------

/**
 * Hourly rainfall for a community over the history window. Weather is regional,
 * so every node in a community responds to the same series.
 *
 * `recentStormEndingHoursAgo` forces a storm to land just before "now", which
 * is what puts Adenta into its elevated opening state.
 */
function rainfallSeries(seedKey: string, recentStormEndingHoursAgo?: number): number[] {
  const r = rng(hashSeed(`rain:${seedKey}`))
  const rain = new Array<number>(HISTORY_HOURS).fill(0)

  const addStorm = (startHour: number, durationHours: number, peakMmPerHour: number) => {
    for (let i = 0; i < durationHours; i++) {
      const t = startHour + i
      if (t < 0 || t >= HISTORY_HOURS) continue
      // Bell-shaped intensity: builds, peaks mid-storm, tails off.
      const shape = Math.sin((Math.PI * (i + 0.5)) / durationHours)
      rain[t] += peakMmPerHour * shape
    }
  }

  // Accra's rainy season delivers roughly this cadence of storms in a month.
  const stormCount = 9
  for (let s = 0; s < stormCount; s++) {
    addStorm(
      Math.floor(r() * (HISTORY_HOURS - 12)),
      2 + Math.floor(r() * 6),
      3 + r() * 25,
    )
  }

  if (recentStormEndingHoursAgo !== undefined) {
    const duration = 5
    addStorm(HISTORY_HOURS - recentStormEndingHoursAgo - duration, duration, 26)
  }

  return rain.map((mm) => Math.round(mm * 10) / 10)
}

const RAINFALL: Record<string, number[]> = {
  // Adenta gets a storm finishing three hours ago — the reason it opens on watch.
  adenta: rainfallSeries('adenta', 3),
  madina: rainfallSeries('madina'),
}

// --- Water level ------------------------------------------------------------

/**
 * Rainfall-response model: level rises with rain and recedes exponentially
 * toward the dry-weather baseline.
 */
function levelSeries(seed: NodeSeed, rain: number[]): number[] {
  const r = rng(hashSeed(`level:${seed.id}`))
  const RECESSION = 0.88 // fraction of the surplus retained each hour
  const RESPONSE = 0.5 // cm of rise per mm/h of rainfall

  const level: number[] = []
  let current = seed.baseCm

  for (let t = 0; t < HISTORY_HOURS; t++) {
    const surplus = (current - seed.baseCm) * RECESSION
    const inflow = (rain[t] ?? 0) * RESPONSE
    // Small diurnal component — tidal backwater and daily usage patterns.
    const diurnal = 2.5 * Math.sin((t / 24) * Math.PI * 2)
    const noise = (r() - 0.5) * 3
    current = seed.baseCm + surplus + inflow + diurnal + noise
    level.push(current)
  }

  // Ramp the tail toward the intended demo state without flattening the shape
  // that came out of the model.
  const RAMP_HOURS = 8
  const drift = seed.targetNowCm - level[HISTORY_HOURS - 1]
  for (let i = 0; i < RAMP_HOURS; i++) {
    const idx = HISTORY_HOURS - RAMP_HOURS + i
    level[idx] += drift * ((i + 1) / RAMP_HOURS)
  }

  return level.map((cm) => Math.round(Math.max(0, cm) * 10) / 10)
}

// --- Assemble ---------------------------------------------------------------

function statusFor(seed: NodeSeed, levelCm: number, lastReadingTime: number): NodeStatus {
  if (NOW_HOUR - lastReadingTime > NODE_OFFLINE_AFTER_MS) return 'offline'
  if (levelCm >= seed.threshold_critical_cm) return 'critical'
  if (levelCm >= seed.threshold_watch_cm) return 'watch'
  return 'normal'
}

const readingsByNode = new Map<string, Reading[]>()
const builtNodes: Node[] = []

for (const seed of NODE_SEEDS) {
  const community = communityById.get(seed.community_id)
  if (!community) continue

  const rain = RAINFALL[seed.community_id] ?? []
  const levels = levelSeries(seed, rain)

  // An offline node simply stops producing readings at its cut-off.
  const cutoff = seed.offlineForHours ?? 0
  const count = HISTORY_HOURS - cutoff

  const series: Reading[] = []
  for (let t = 0; t < count; t++) {
    series.push({
      node_id: seed.id,
      timestamp: new Date(NOW_HOUR - (HISTORY_HOURS - 1 - t) * HOUR_MS).toISOString(),
      water_level_cm: levels[t],
      rainfall_mm: seed.hasRainGauge ? (rain[t] ?? 0) : null,
    })
  }
  readingsByNode.set(seed.id, series)

  const last = series[series.length - 1]
  const lastTime = new Date(last.timestamp).getTime()
  const [lat, lng] = offsetKm(community.lat, community.lng, seed.dNorthKm, seed.dEastKm)

  builtNodes.push({
    id: seed.id,
    community_id: seed.community_id,
    name: seed.name,
    lat,
    lng,
    status: statusFor(seed, last.water_level_cm, lastTime),
    last_reading_cm: last.water_level_cm,
    last_reading_time: last.timestamp,
    battery_pct: seed.battery_pct,
    solar_charging: seed.solar_charging,
    threshold_watch_cm: seed.threshold_watch_cm,
    threshold_critical_cm: seed.threshold_critical_cm,
  })
}

export const nodes = builtNodes
export const readings = readingsByNode
export { HISTORY_DAYS }

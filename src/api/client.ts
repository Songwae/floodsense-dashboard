import type { Alert, Community, FloodEvent, Node, Reading } from '../types'
import { alerts as mockAlerts } from './mock/alerts'
import { communities as mockCommunities } from './mock/communities'
import { floodEvents as mockEvents } from './mock/events'
import { HISTORY_DAYS, nodes as mockNodes, readings as mockReadings } from './mock/network'

// The seam between the dashboard and its data source.
//
// Every component talks to `api`, never to the mock modules directly. Two
// implementations satisfy the same interface:
//
//   mockApi  — generated demo data, used when no backend URL is configured
//   httpApi  — plain REST calls against the real FloodSense backend
//
// Switching over is a config change, not a rewrite: set VITE_API_BASE_URL in
// `.env` and the dashboard talks to the real thing. If the real backend's
// routes or field names differ, `httpApi` is the single file to adjust.

export interface AlertQuery {
  communityId?: string
  /** Inclusive ISO date bounds (YYYY-MM-DD). */
  from?: string
  to?: string
}

export interface FloodSenseApi {
  getCommunities(): Promise<Community[]>
  getNodes(): Promise<Node[]>
  getAlerts(query?: AlertQuery): Promise<Alert[]>
  /** Hourly readings for one node, most recent last. */
  getReadings(nodeId: string, days: number): Promise<Reading[]>
  getFloodEvents(): Promise<FloodEvent[]>
}

// --- Mock implementation ----------------------------------------------------

/** A touch of latency so loading states are exercised during development. */
function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function matchesQuery(alert: Alert, query: AlertQuery): boolean {
  if (query.communityId && alert.community_id !== query.communityId) return false
  const day = alert.timestamp.slice(0, 10)
  if (query.from && day < query.from) return false
  if (query.to && day > query.to) return false
  return true
}

export const mockApi: FloodSenseApi = {
  getCommunities: () => delay(mockCommunities),
  getNodes: () => delay(mockNodes),
  getAlerts: (query = {}) => delay(mockAlerts.filter((a) => matchesQuery(a, query))),
  getReadings: (nodeId, days) => {
    const series = mockReadings.get(nodeId) ?? []
    // The generator only holds HISTORY_DAYS; asking for more yields what exists.
    const wanted = Math.min(days, HISTORY_DAYS) * 24
    return delay(series.slice(-wanted))
  },
  getFloodEvents: () => delay(mockEvents),
}

// --- HTTP implementation ----------------------------------------------------

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(`${BASE_URL.replace(/\/$/, '')}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export const httpApi: FloodSenseApi = {
  getCommunities: () => get<Community[]>('/communities'),
  getNodes: () => get<Node[]>('/nodes'),
  getAlerts: (query = {}) =>
    get<Alert[]>('/alerts', {
      community_id: query.communityId,
      from: query.from,
      to: query.to,
    }),
  getReadings: (nodeId, days) => get<Reading[]>(`/nodes/${nodeId}/readings`, { days }),
  getFloodEvents: () => get<FloodEvent[]>('/events'),
}

/**
 * True while the dashboard is running on generated data. The UI surfaces this
 * prominently — nobody should ever mistake a demo for a live flood picture.
 */
export const IS_MOCK = BASE_URL === ''

export const api: FloodSenseApi = IS_MOCK ? mockApi : httpApi

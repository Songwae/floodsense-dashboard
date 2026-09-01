import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api } from '../api/client'
import { ACTIVE_ALERT_WINDOW_MS } from '../api/mock/alerts'
import type { Alert, Community, FloodEvent, Node } from '../types'
import { isActionable, severity } from '../lib/risk'
import { DashboardContext, type DashboardValue, type Summary } from './dashboard'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

/**
 * Demo escalation. Pitching a flood dashboard while every light is green is a
 * hard sell, so the presenter can push Adenta into a critical state on stage.
 * It rewrites data at the edge of the store rather than anywhere deeper, and
 * the UI shows a persistent SIMULATION banner while it is on — this must never
 * be mistakable for a real reading.
 */
const SIMULATED_COMMUNITY = 'adenta'
const SIMULATED_NODE = 'ADT-02'

function escalate(communities: Community[], nodes: Node[]): [Community[], Node[]] {
  return [
    communities.map((c) =>
      c.id === SIMULATED_COMMUNITY ? { ...c, current_risk_level: 'critical' as const } : c,
    ),
    nodes.map((n) =>
      n.id === SIMULATED_NODE
        ? {
            ...n,
            status: 'critical' as const,
            last_reading_cm: n.threshold_critical_cm + 17.4,
            last_reading_time: new Date().toISOString(),
          }
        : n,
    ),
  ]
}

function buildSummary(communities: Community[], nodes: Node[], alerts: Alert[]): Summary {
  const now = Date.now()
  const live = communities.filter((c) => c.coverage === 'live')

  const criticalCommunities = live.filter((c) => c.current_risk_level === 'critical')
  const watchCommunities = live.filter((c) => c.current_risk_level === 'watch')

  const recent = alerts.filter((a) => now - new Date(a.timestamp).getTime() <= WEEK_MS)

  // "Under an active alert" means a recent alert AND a risk level that still
  // warrants action — an all-clear sent an hour ago should not inflate this.
  const activeCommunityIds = new Set(
    alerts
      .filter(
        (a) =>
          now - new Date(a.timestamp).getTime() <= ACTIVE_ALERT_WINDOW_MS &&
          isActionable(a.risk_level),
      )
      .map((a) => a.community_id),
  )
  const householdsUnderActiveAlert = live
    .filter((c) => activeCommunityIds.has(c.id) && isActionable(c.current_risk_level))
    .reduce((sum, c) => sum + c.households, 0)

  return {
    totalCommunities: communities.length,
    liveCommunities: live.length,
    plannedCommunities: communities.length - live.length,
    totalNodes: nodes.length,
    reportingNodes: nodes.filter((n) => n.status !== 'offline').length,
    offlineNodes: nodes.filter((n) => n.status === 'offline').length,
    criticalCommunities,
    watchCommunities,
    systemLevel: criticalCommunities.length
      ? 'critical'
      : watchCommunities.length
        ? 'watch'
        : 'normal',
    alertsToday: alerts.filter((a) => now - new Date(a.timestamp).getTime() <= DAY_MS).length,
    alertsThisWeek: recent.length,
    householdsUnderActiveAlert,
    failedAlertsThisWeek: recent.filter((a) => a.delivery_status === 'failed').length,
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<{
    communities: Community[]
    nodes: Node[]
    alerts: Alert[]
    events: FloodEvent[]
  }>({ communities: [], nodes: [], alerts: [], events: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([api.getCommunities(), api.getNodes(), api.getAlerts(), api.getFloodEvents()])
      .then(([communities, nodes, alerts, events]) => {
        if (cancelled) return
        setRaw({ communities, nodes, alerts, events })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Could not load dashboard data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const value = useMemo<DashboardValue>(() => {
    const [communities, nodes] = simulating
      ? escalate(raw.communities, raw.nodes)
      : [raw.communities, raw.nodes]

    const nodesByCommunity = new Map<string, Node[]>()
    for (const node of nodes) {
      const list = nodesByCommunity.get(node.community_id)
      if (list) list.push(node)
      else nodesByCommunity.set(node.community_id, [node])
    }
    // Worst-first inside each community, so the node that needs attention is
    // the one at the top of every list.
    for (const list of nodesByCommunity.values()) {
      list.sort((a, b) => severity(b.status) - severity(a.status) || a.id.localeCompare(b.id))
    }

    return {
      loading,
      error,
      communities,
      nodes,
      alerts: raw.alerts,
      events: raw.events,
      nodesByCommunity,
      communityById: new Map(communities.map((c) => [c.id, c])),
      nodeById: new Map(nodes.map((n) => [n.id, n])),
      summary: buildSummary(communities, nodes, raw.alerts),
      simulating,
      setSimulating,
      reload,
    }
  }, [raw, loading, error, simulating, reload])

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

import { createContext, use } from 'react'
import type { Alert, Community, FloodEvent, Node, RiskLevel } from '../types'

export interface Summary {
  totalCommunities: number
  liveCommunities: number
  plannedCommunities: number
  totalNodes: number
  reportingNodes: number
  offlineNodes: number
  /** Live communities at each risk level, most severe first. */
  criticalCommunities: Community[]
  watchCommunities: Community[]
  /** Worst risk level currently in play, for the system status banner. */
  systemLevel: RiskLevel
  alertsToday: number
  alertsThisWeek: number
  householdsUnderActiveAlert: number
  failedAlertsThisWeek: number
}

export interface DashboardValue {
  loading: boolean
  error: string | null
  communities: Community[]
  nodes: Node[]
  alerts: Alert[]
  events: FloodEvent[]
  /** Live nodes grouped by community id. Planned communities have no entry. */
  nodesByCommunity: Map<string, Node[]>
  communityById: Map<string, Community>
  nodeById: Map<string, Node>
  summary: Summary
  /** Demo-only escalation, clearly labelled wherever it is active. */
  simulating: boolean
  setSimulating: (on: boolean) => void
  reload: () => void
}

export const DashboardContext = createContext<DashboardValue | null>(null)

export function useDashboard(): DashboardValue {
  const value = use(DashboardContext)
  if (!value) throw new Error('useDashboard must be used inside <DashboardProvider>')
  return value
}

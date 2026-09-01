import { AlertsPanel } from './AlertsPanel'
import { DetailPanel } from './DetailPanel'
import { MitigationPanel } from './MitigationPanel'
import { TrendsPanel } from './TrendsPanel'
import { isActionable } from '../lib/risk'
import { useDashboard } from '../state/dashboard'
import type { Selection } from '../state/selection'

// Supporting panels live behind tabs so they never compete with the map for
// space. Tab badges carry the counts that would otherwise need a visit.

export type TabKey = 'detail' | 'alerts' | 'mitigation' | 'trends'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'detail', label: 'Detail' },
  { key: 'mitigation', label: 'Respond' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'trends', label: 'History' },
]

export function SidePanel({
  tab,
  onTabChange,
  selection,
  onSelect,
}: {
  tab: TabKey
  onTabChange: (tab: TabKey) => void
  selection: Selection
  onSelect: (selection: Selection) => void
}) {
  const { communities, summary } = useDashboard()

  const actionableCount = communities.filter(
    (c) => c.coverage === 'live' && isActionable(c.current_risk_level),
  ).length

  const badges: Partial<Record<TabKey, { count: number; urgent: boolean }>> = {
    mitigation: { count: actionableCount, urgent: summary.systemLevel === 'critical' },
    alerts: { count: summary.alertsToday, urgent: false },
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-900">
      <nav
        className="flex shrink-0 border-b border-slate-800"
        role="tablist"
        aria-label="Dashboard panels"
      >
        {TABS.map(({ key, label }) => {
          const badge = badges[key]
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-sky-400 bg-slate-800/50 text-white'
                  : 'border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
              }`}
            >
              {label}
              {badge && badge.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    badge.urgent ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {badge.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === 'detail' && <DetailPanel selection={selection} onSelect={onSelect} />}
        {tab === 'mitigation' && <MitigationPanel onSelect={onSelect} />}
        {tab === 'alerts' && <AlertsPanel onSelect={onSelect} />}
        {tab === 'trends' && <TrendsPanel />}
      </div>
    </div>
  )
}

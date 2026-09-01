import { IS_MOCK } from '../api/client'
import { num, plural } from '../lib/format'
import { RISK } from '../lib/risk'
import { useDashboard } from '../state/dashboard'
import type { Selection } from '../state/selection'
import { Stat } from './ui'

// Overview header. The one thing a coordinator walking up to this screen must
// be able to read from a few metres away is the banner: is anything wrong?

function StatusBanner({ onSelect }: { onSelect: (selection: Selection) => void }) {
  const { summary, simulating } = useDashboard()
  const { systemLevel, criticalCommunities, watchCommunities } = summary

  const tone = {
    normal: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200',
    watch: 'bg-amber-500/10 border-amber-500/40 text-amber-100',
    critical: 'bg-red-500/15 border-red-500/50 text-red-100',
  }[systemLevel]

  const affected = [...criticalCommunities, ...watchCommunities]

  const headline =
    systemLevel === 'normal'
      ? 'All clear — no communities on watch'
      : [
          criticalCommunities.length && `${criticalCommunities.length} critical`,
          watchCommunities.length && `${watchCommunities.length} on watch`,
        ]
          .filter(Boolean)
          .join(' · ')

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 ${tone}`}>
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${RISK[systemLevel].dot} ${
          systemLevel === 'critical' ? 'animate-pulse' : ''
        }`}
        aria-hidden
      />
      <span className="text-sm font-semibold">{headline}</span>

      {affected.length > 0 && (
        <span className="flex flex-wrap items-center gap-1.5">
          {affected.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect({ kind: 'community', id: c.id })}
              className="rounded bg-black/25 px-2 py-0.5 text-xs font-medium underline-offset-2 hover:underline"
            >
              {c.name} — {RISK[c.current_risk_level].short}
            </button>
          ))}
        </span>
      )}

      {simulating && (
        <span className="ml-auto rounded bg-fuchsia-500/25 px-2 py-0.5 text-xs font-bold tracking-wider text-fuchsia-100 uppercase ring-1 ring-fuchsia-400/60">
          Simulated event — not real data
        </span>
      )}
    </div>
  )
}

export function Header({ onSelect }: { onSelect: (selection: Selection) => void }) {
  const { summary, simulating, setSimulating } = useDashboard()

  return (
    <header className="shrink-0 border-b border-slate-800 bg-slate-900">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white">FloodSense Ghana</h1>
            {IS_MOCK && (
              <span
                className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-200 uppercase"
                title="No backend is connected. Every reading, alert and event on this screen is generated demo data."
              >
                Demo data
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">NADMO operations dashboard · Greater Accra</p>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-3">
          <Stat
            label="Communities"
            value={num(summary.totalCommunities)}
            hint={`${summary.liveCommunities} live · ${summary.plannedCommunities} planned`}
          />
          <Stat
            label="Nodes reporting"
            value={
              <>
                {num(summary.reportingNodes)}
                <span className="text-base font-normal text-slate-500">/{summary.totalNodes}</span>
              </>
            }
            hint={
              summary.offlineNodes
                ? `${plural(summary.offlineNodes, 'node')} offline`
                : 'All nodes reporting'
            }
            tone={summary.offlineNodes ? 'warn' : 'good'}
          />
          <Stat
            label="Alerts today"
            value={num(summary.alertsToday)}
            hint={`${num(summary.alertsThisWeek)} this week`}
          />
          <Stat
            label="Households alerted"
            value={num(summary.householdsUnderActiveAlert)}
            hint="Under an active alert"
            tone={summary.householdsUnderActiveAlert ? 'warn' : 'default'}
          />
        </div>

        {/* Demo control. Deliberately labelled, deliberately not subtle. */}
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-300 select-none">
          <input
            type="checkbox"
            checked={simulating}
            onChange={(e) => setSimulating(e.target.checked)}
            className="h-3.5 w-3.5 accent-fuchsia-500"
          />
          Simulate critical event
        </label>
      </div>

      <StatusBanner onSelect={onSelect} />
    </header>
  )
}

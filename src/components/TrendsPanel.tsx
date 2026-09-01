import { useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useReadings } from '../hooks/useReadings'
import { num, shortDate } from '../lib/format'
import { RISK } from '../lib/risk'
import { useDashboard } from '../state/dashboard'
import type { Reading } from '../types'
import { Empty, Section } from './ui'

// Historical view: what the water has been doing, and how well the predictions
// have held up.

const AXIS = { stroke: '#64748b', fontSize: 10 }
const inputClass =
  'rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none'

interface Point {
  label: string
  peakLevel: number
  rainfall: number | null
}

/**
 * Bucket hourly readings for display. Water level aggregates by MAX, not mean —
 * a daily average hides exactly the peak that caused the flood.
 */
function bucket(readings: Reading[], hoursPerBucket: number): Point[] {
  const points: Point[] = []

  for (let i = 0; i < readings.length; i += hoursPerBucket) {
    const slice = readings.slice(i, i + hoursPerBucket)
    if (slice.length === 0) continue

    const hasRain = slice.some((r) => r.rainfall_mm !== null)
    const last = slice[slice.length - 1]

    points.push({
      label:
        hoursPerBucket >= 24
          ? shortDate(last.timestamp)
          : `${shortDate(last.timestamp)} ${new Date(last.timestamp).getHours()}:00`,
      peakLevel: Math.round(Math.max(...slice.map((r) => r.water_level_cm)) * 10) / 10,
      rainfall: hasRain
        ? Math.round(slice.reduce((sum, r) => sum + (r.rainfall_mm ?? 0), 0) * 10) / 10
        : null,
    })
  }

  return points
}

function EventLog({ communityId }: { communityId: string }) {
  const { events, communityById } = useDashboard()
  const rows = events.filter((e) => e.community_id === communityId)

  if (rows.length === 0) {
    return <Empty>No flood events logged for this community.</Empty>
  }

  const resolved = rows.filter((e) => e.materialised !== null)
  const hits = resolved.filter((e) => e.materialised).length
  const community = communityById.get(communityId)

  return (
    <div>
      <div className="mb-3 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2.5">
        <div className="text-sm text-slate-200">
          <span className="text-lg font-bold tabular-nums text-white">
            {hits}/{resolved.length}
          </span>{' '}
          predictions for {community?.name} were followed by actual flooding.
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {resolved.length - hits === 1
            ? 'The one that was not is a false alarm, and it is listed'
            : `The ${resolved.length - hits} that were not are false alarms, and they are listed`}{' '}
          below alongside the rest. A warning system that only publishes its successes cannot be
          audited.
        </p>
      </div>

      <ul className="space-y-1.5">
        {rows.map((event) => {
          const outcome =
            event.materialised === null
              ? { label: 'Unresolved', cls: 'bg-slate-500/15 text-slate-300 ring-slate-500/40' }
              : event.materialised
                ? { label: 'Flooding occurred', cls: 'bg-red-500/15 text-red-300 ring-red-500/40' }
                : { label: 'False alarm', cls: 'bg-slate-500/15 text-slate-400 ring-slate-500/40' }

          return (
            <li
              key={event.id}
              className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-slate-100">
                  {shortDate(event.predicted_at)}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ring-1 ${RISK[event.predicted_risk_level].badge}`}
                >
                  Predicted: {RISK[event.predicted_risk_level].short}
                </span>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ring-1 ${outcome.cls}`}>
                  {outcome.label}
                </span>
                {event.peak_level_cm !== null && (
                  <span className="ml-auto text-xs tabular-nums text-slate-400">
                    peak {event.peak_level_cm} cm
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{event.notes}</p>
              <div className="mt-1 font-mono text-[10px] text-slate-600">{event.id}</div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function TrendsPanel() {
  const { communities, nodesByCommunity } = useDashboard()

  const liveCommunities = communities.filter((c) => c.coverage === 'live')
  const [communityId, setCommunityId] = useState(liveCommunities[0]?.id ?? '')
  const [days, setDays] = useState<7 | 30>(7)

  const nodes = nodesByCommunity.get(communityId) ?? []
  const [nodeId, setNodeId] = useState('')
  // Fall back to the community's first node whenever the selection is stale.
  const activeNodeId = nodes.some((n) => n.id === nodeId) ? nodeId : (nodes[0]?.id ?? null)
  const activeNode = nodes.find((n) => n.id === activeNodeId) ?? null

  const { readings, loading } = useReadings(activeNodeId, days)

  const data = useMemo(() => bucket(readings, days === 7 ? 2 : 6), [readings, days])
  const hasRainfall = data.some((p) => p.rainfall !== null)

  // Force both thresholds into the y-domain. Left to auto-scale, a quiet week
  // never reaches the critical line and Recharts drops it off the top of the
  // chart — losing the one reference that tells you how much headroom is left.
  const levelDomain = ((): [number, number] => {
    const values = data.map((p) => p.peakLevel)
    if (activeNode) values.push(activeNode.threshold_watch_cm, activeNode.threshold_critical_cm)
    if (values.length === 0) return [0, 100]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = Math.max(10, (max - min) * 0.1)
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)]
  })()

  if (liveCommunities.length === 0) {
    return (
      <Section title="Historical trends">
        <Empty>No community has live sensors yet.</Empty>
      </Section>
    )
  }

  return (
    <div>
      <Section title="Historical trends">
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs text-slate-400">Community</span>
            <select
              value={communityId}
              onChange={(e) => {
                setCommunityId(e.target.value)
                setNodeId('')
              }}
              className={inputClass}
            >
              {liveCommunities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs text-slate-400">Node</span>
            <select
              value={activeNodeId ?? ''}
              onChange={(e) => setNodeId(e.target.value)}
              className={inputClass}
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id} — {n.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Range</span>
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-700">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    days === d
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title={`Water level — last ${days} days`}
        action={
          activeNode && (
            <span className="text-xs text-slate-500">
              {activeNode.id} · peak per {days === 7 ? '2 h' : '6 h'}
            </span>
          )
        }
      >
        {loading ? (
          <div className="h-64 animate-pulse rounded-lg bg-slate-800/60" />
        ) : data.length === 0 ? (
          <Empty>No readings available for this node.</Empty>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={AXIS}
                    interval="preserveStartEnd"
                    minTickGap={50}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="level"
                    tick={AXIS}
                    width={44}
                    tickLine={false}
                    unit="cm"
                    domain={levelDomain}
                  />
                  {hasRainfall && (
                    <YAxis
                      yAxisId="rain"
                      orientation="right"
                      tick={AXIS}
                      width={40}
                      tickLine={false}
                      unit="mm"
                      // Rain is drawn from the top down, the way hyetographs
                      // are conventionally plotted, so it doesn't collide with
                      // the level trace.
                      reversed
                    />
                  )}
                  <ChartTooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />

                  {hasRainfall && (
                    <Bar
                      yAxisId="rain"
                      dataKey="rainfall"
                      name="Rainfall (mm)"
                      fill="#38bdf8"
                      fillOpacity={0.35}
                      isAnimationActive={false}
                    />
                  )}

                  {activeNode && (
                    <>
                      <ReferenceLine
                        yAxisId="level"
                        y={activeNode.threshold_watch_cm}
                        stroke={RISK.watch.hex}
                        strokeDasharray="4 4"
                      />
                      <ReferenceLine
                        yAxisId="level"
                        y={activeNode.threshold_critical_cm}
                        stroke={RISK.critical.hex}
                        strokeDasharray="4 4"
                      />
                    </>
                  )}

                  <Line
                    yAxisId="level"
                    type="monotone"
                    dataKey="peakLevel"
                    name="Peak water level (cm)"
                    stroke="#e2e8f0"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Dashed lines mark this node's watch ({num(activeNode?.threshold_watch_cm ?? 0)} cm)
              and critical ({num(activeNode?.threshold_critical_cm ?? 0)} cm) thresholds.
              {!hasRainfall && ' This node has no rain gauge, so no rainfall overlay is shown.'}
            </p>
          </>
        )}
      </Section>

      <Section title="Flood event log">
        <EventLog communityId={communityId} />
      </Section>
    </div>
  )
}

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useReadings } from '../hooks/useReadings'
import { clockTime, dateTime, num, plural, timeAgo } from '../lib/format'
import { RISK } from '../lib/risk'
import { useDashboard } from '../state/dashboard'
import type { Selection } from '../state/selection'
import type { Node } from '../types'
import { Bar, CoverageBadge, Empty, Field, Provisional, Section, StatusBadge } from './ui'

// Detail for whatever is selected on the map: one node, or one community.

const AXIS = { stroke: '#64748b', fontSize: 10 }

function batteryTone(pct: number): string {
  if (pct < 20) return 'bg-red-400'
  if (pct < 45) return 'bg-amber-400'
  return 'bg-emerald-400'
}

function NodeTrend({ node }: { node: Node }) {
  const { readings, loading } = useReadings(node.id, 1)

  if (loading) {
    return <div className="h-32 animate-pulse rounded-lg bg-slate-800/60" />
  }
  if (readings.length === 0) {
    return <Empty>No readings in the last 24 hours.</Empty>
  }

  const data = readings.map((r) => ({
    t: clockTime(r.timestamp),
    level: r.water_level_cm,
  }))

  // Scale to include the thresholds, so "how close are we?" is readable from
  // the shape of the chart rather than by comparing numbers.
  const levels = readings.map((r) => r.water_level_cm)
  const min = Math.min(...levels, node.threshold_watch_cm)
  const max = Math.max(...levels, node.threshold_critical_cm)
  const pad = Math.max(8, (max - min) * 0.12)

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#1e293b" vertical={false} />
          <XAxis dataKey="t" tick={AXIS} interval="preserveStartEnd" minTickGap={40} tickLine={false} />
          <YAxis
            tick={AXIS}
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            width={44}
            tickLine={false}
            unit="cm"
          />
          <ChartTooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(v: unknown) => [`${v as number} cm`, 'Water level'] as [string, string]}
          />
          <ReferenceLine
            y={node.threshold_watch_cm}
            stroke={RISK.watch.hex}
            strokeDasharray="4 4"
            label={{ value: 'Watch', position: 'insideTopLeft', fill: RISK.watch.hex, fontSize: 10 }}
          />
          <ReferenceLine
            y={node.threshold_critical_cm}
            stroke={RISK.critical.hex}
            strokeDasharray="4 4"
            label={{
              value: 'Critical',
              position: 'insideTopLeft',
              fill: RISK.critical.hex,
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="level"
            stroke={RISK[node.status === 'offline' ? 'offline' : node.status].hex}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function NodeDetail({
  nodeId,
  onSelect,
}: {
  nodeId: string
  onSelect: (selection: Selection) => void
}) {
  const { nodeById, communityById } = useDashboard()
  const node = nodeById.get(nodeId)
  if (!node) return <Empty>Node not found.</Empty>

  const community = communityById.get(node.community_id)
  const offline = node.status === 'offline'

  return (
    <div>
      <Section
        title="Sensor node"
        action={<StatusBadge status={node.status} full />}
      >
        <div className="text-lg font-semibold text-white">{node.id}</div>
        <div className="text-sm text-slate-400">{node.name}</div>

        {offline && (
          <p className="mt-3 rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-300">
            This node has not reported for {timeAgo(node.last_reading_time)}. Readings below are its
            last known values, not current conditions.
          </p>
        )}

        <dl className="mt-3 divide-y divide-slate-800">
          <Field label={offline ? 'Last known level' : 'Water level'}>
            <span className="text-base tabular-nums">{node.last_reading_cm} cm</span>
          </Field>
          <Field label="Watch threshold">
            <span className="tabular-nums text-amber-300">{node.threshold_watch_cm} cm</span>
          </Field>
          <Field label="Critical threshold">
            <span className="tabular-nums text-red-300">{node.threshold_critical_cm} cm</span>
          </Field>
          <Field label="Last reading">
            <span className={offline ? 'text-amber-300' : ''}>
              {timeAgo(node.last_reading_time)}
            </span>
            <div className="text-xs font-normal text-slate-500">
              {dateTime(node.last_reading_time)}
            </div>
          </Field>
          <Field label="Community">
            {community ? (
              <button
                type="button"
                onClick={() => onSelect({ kind: 'community', id: community.id })}
                className="text-sky-300 underline-offset-2 hover:underline"
              >
                {community.name}
              </button>
            ) : (
              '—'
            )}
          </Field>
        </dl>
      </Section>

      <Section title="Last 24 hours">
        <NodeTrend node={node} />
      </Section>

      <Section title="Power">
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="text-slate-400">Battery</span>
              <span className="font-medium tabular-nums text-slate-100">{node.battery_pct}%</span>
            </div>
            <Bar pct={node.battery_pct} tone={batteryTone(node.battery_pct)} />
          </div>
          <dl className="divide-y divide-slate-800">
            <Field label="Solar">
              {node.solar_charging === null ? (
                <span className="text-slate-400">No panel fitted</span>
              ) : node.solar_charging ? (
                <span className="text-emerald-300">Charging</span>
              ) : (
                <span className="text-amber-300">Not charging</span>
              )}
            </Field>
          </dl>
          {node.battery_pct < 20 && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Battery critically low — schedule a site visit. A node that dies during a storm is a
              blind spot exactly when it matters most.
            </p>
          )}
        </div>
      </Section>
    </div>
  )
}

function CommunityDetail({
  communityId,
  onSelect,
}: {
  communityId: string
  onSelect: (selection: Selection) => void
}) {
  const { communityById, nodesByCommunity, alerts } = useDashboard()
  const community = communityById.get(communityId)
  if (!community) return <Empty>Community not found.</Empty>

  const nodes = nodesByCommunity.get(communityId) ?? []
  const communityAlerts = alerts.filter((a) => a.community_id === communityId)
  const lastAlert = communityAlerts[0]
  const planned = community.coverage === 'planned'

  return (
    <div>
      <Section
        title="Community"
        action={
          planned ? (
            <CoverageBadge coverage="planned" />
          ) : (
            <StatusBadge status={community.current_risk_level} full />
          )
        }
      >
        <div className="text-lg font-semibold text-white">{community.name}</div>
        <div className="text-sm text-slate-400">{community.district}</div>

        {planned && (
          <p className="mt-3 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100">
            Planned coverage. No sensors are installed here yet, so there is no live water level,
            no risk assessment and no alerting. The zone is shown to indicate where the network is
            expanding next.
          </p>
        )}

        <dl className="mt-3 divide-y divide-slate-800">
          <Field label="Households in zone">
            <span className="tabular-nums">{num(community.households)}</span>
            {!community.households_verified && <Provisional>est.</Provisional>}
          </Field>
          <Field label="Sensor nodes">
            {planned ? <span className="text-slate-400">None installed</span> : num(nodes.length)}
          </Field>
          <Field label="Alerts sent">
            {planned ? (
              <span className="text-slate-400">—</span>
            ) : (
              <span className="tabular-nums">{num(communityAlerts.length)}</span>
            )}
            {!planned && (
              <div className="text-xs font-normal text-slate-500">last 14 days</div>
            )}
          </Field>
          <Field label="Last alert">
            {lastAlert ? (
              <>
                {timeAgo(lastAlert.timestamp)}
                <div className="text-xs font-normal text-slate-500">
                  {dateTime(lastAlert.timestamp)} · {RISK[lastAlert.risk_level].short}
                </div>
              </>
            ) : (
              <span className="text-slate-400">Never</span>
            )}
          </Field>
        </dl>
      </Section>

      {!planned && (
        <Section title={`Nodes in ${community.name}`}>
          <ul className="space-y-1.5">
            {nodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => onSelect({ kind: 'node', id: node.id })}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2 text-left transition-colors hover:border-slate-600 hover:bg-slate-800"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-100">{node.id}</span>
                    <span className="block truncate text-xs text-slate-400">{node.name}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-slate-100">
                      {node.status === 'offline' ? '—' : `${node.last_reading_cm} cm`}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {timeAgo(node.last_reading_time)}
                    </span>
                  </span>
                  <StatusBadge status={node.status} />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Response resources">
        <dl className="divide-y divide-slate-800">
          <Field label="Assembly point">
            {community.shelter_name}
            <Provisional>unconfirmed</Provisional>
          </Field>
          <Field label="NADMO office">{community.nadmo_office}</Field>
          <Field label="Contact">
            <span className="tabular-nums">{community.nadmo_contact}</span>
            <Provisional>placeholder</Provisional>
          </Field>
          <Field label="Health facility">{community.health_facility}</Field>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Shelter locations and phone numbers are placeholders pending confirmation from NADMO's
          district directory. Do not dial these during a live incident.
        </p>
      </Section>
    </div>
  )
}

export function DetailPanel({
  selection,
  onSelect,
}: {
  selection: Selection
  onSelect: (selection: Selection) => void
}) {
  const { communities, nodesByCommunity } = useDashboard()

  if (!selection) {
    // Empty state doubles as a directory, so the panel is useful before the
    // operator has clicked anything.
    return (
      <div>
        <Section title="Select on the map">
          <p className="text-sm text-slate-400">
            Choose a sensor node or a community zone to see detail here.
          </p>
        </Section>
        <Section title="Communities">
          <ul className="space-y-1.5">
            {communities.map((community) => {
              const nodes = nodesByCommunity.get(community.id) ?? []
              return (
                <li key={community.id}>
                  <button
                    type="button"
                    onClick={() => onSelect({ kind: 'community', id: community.id })}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2 text-left transition-colors hover:border-slate-600 hover:bg-slate-800"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-100">
                        {community.name}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {community.coverage === 'planned'
                          ? `No sensors yet · ${num(community.households)} households (est.)`
                          : `${plural(nodes.length, 'node')} · ${num(community.households)} households (est.)`}
                      </span>
                    </span>
                    {community.coverage === 'planned' ? (
                      <CoverageBadge coverage="planned" />
                    ) : (
                      <StatusBadge status={community.current_risk_level} />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </Section>
      </div>
    )
  }

  return selection.kind === 'node' ? (
    <NodeDetail nodeId={selection.id} onSelect={onSelect} />
  ) : (
    <CommunityDetail communityId={selection.id} onSelect={onSelect} />
  )
}

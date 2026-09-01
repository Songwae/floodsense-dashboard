import { useState } from 'react'

import { distanceKm, formatKm } from '../lib/geo'
import { num, plural, timeAgo } from '../lib/format'
import { ACTION_CHECKLIST, RISK, isActionable, severity } from '../lib/risk'
import { useDashboard } from '../state/dashboard'
import type { Selection } from '../state/selection'
import type { Community } from '../types'
import { Empty, Field, Provisional, Section, StatusBadge } from './ui'

// "What do we do right now."
//
// This is the panel that makes the dashboard worth opening during an incident
// rather than after one. It only ever shows communities that need a decision —
// if nothing is elevated, it says so and gets out of the way.

function CommunityCard({
  community,
  checked,
  onToggle,
  onSelect,
}: {
  community: Community
  checked: Set<string>
  onToggle: (key: string) => void
  onSelect: (selection: Selection) => void
}) {
  const { nodesByCommunity, alerts } = useDashboard()
  const nodes = nodesByCommunity.get(community.id) ?? []
  const level = community.current_risk_level
  const style = RISK[level]

  const lastAlert = alerts.find((a) => a.community_id === community.id)
  const shelterDistance = distanceKm(
    community.lat,
    community.lng,
    community.shelter_lat,
    community.shelter_lng,
  )

  const checklist = ACTION_CHECKLIST[level]
  const doneCount = checklist.filter((_, i) => checked.has(`${community.id}:${i}`)).length

  // Households at risk is the whole zone, not a modelled sub-area. Said plainly
  // rather than dressed up as precision the data doesn't support.
  const offlineNodes = nodes.filter((n) => n.status === 'offline')

  return (
    <article className={`rounded-xl border ${style.surface} overflow-hidden`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-800 px-4 py-3">
        <button
          type="button"
          onClick={() => onSelect({ kind: 'community', id: community.id })}
          className="text-base font-bold text-white underline-offset-2 hover:underline"
        >
          {community.name}
        </button>
        <StatusBadge status={level} full />
        <span className="ml-auto text-xs text-slate-400">{community.district}</span>
      </header>

      <div className="grid gap-4 px-4 py-3 sm:grid-cols-2">
        <div>
          <h4 className="mb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            People at risk
          </h4>
          <div className="text-2xl font-bold tabular-nums text-white">
            {num(community.households)}
            <span className="ml-1.5 text-sm font-normal text-slate-400">households</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Everyone inside the predicted flood extent. Working estimate, not a verified count.
          </p>
        </div>

        <div>
          <h4 className="mb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Nearest assembly point
          </h4>
          <div className="text-sm font-semibold text-white">
            {community.shelter_name}
            <Provisional>unconfirmed</Provisional>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatKm(shelterDistance)} from the zone centre, straight line — not a road distance.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-800 px-4 py-3">
        <h4 className="mb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Emergency contacts
        </h4>
        <dl className="divide-y divide-slate-800">
          <Field label={community.nadmo_office}>
            {/* Not a tel: link while these are placeholder numbers — a
                one-tap call to a stranger mid-incident is not a nice bug.
                Swap to <a href={`tel:${...}`}> once real numbers land. */}
            <span className="tabular-nums">{community.nadmo_contact}</span>
            <Provisional>placeholder</Provisional>
          </Field>
          <Field label="Health facility">{community.health_facility}</Field>
          <Field label="National emergency">
            <span className="tabular-nums">112</span>
          </Field>
        </dl>
      </div>

      <div className="border-t border-slate-800 px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <h4 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Recommended actions
          </h4>
          <span className="text-xs tabular-nums text-slate-500">
            {doneCount}/{checklist.length} done
          </span>
        </div>
        <ul className="space-y-1">
          {checklist.map((action, i) => {
            const key = `${community.id}:${i}`
            const isDone = checked.has(key)
            return (
              <li key={key}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-800/60">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => onToggle(key)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                  />
                  <span className={isDone ? 'text-slate-500 line-through' : 'text-slate-200'}>
                    {action}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Standard checklist for {style.short.toLowerCase()} level. Replace with NADMO's own
          standard operating procedure when available. Ticks are local to this browser session and
          are not shared with other responders.
        </p>
      </div>

      <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-800 bg-slate-900/40 px-4 py-2 text-xs text-slate-400">
        <span>
          {plural(nodes.length, 'node')}
          {offlineNodes.length > 0 && (
            <span className="text-amber-300"> · {offlineNodes.length} offline</span>
          )}
        </span>
        <span>
          {lastAlert
            ? `Last alert ${timeAgo(lastAlert.timestamp)} (${num(lastAlert.recipients_count)} recipients)`
            : 'No alerts sent'}
        </span>
      </footer>
    </article>
  )
}

export function MitigationPanel({ onSelect }: { onSelect: (selection: Selection) => void }) {
  const { communities } = useDashboard()
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const needsAction = communities
    .filter((c) => c.coverage === 'live' && isActionable(c.current_risk_level))
    .sort((a, b) => severity(b.current_risk_level) - severity(a.current_risk_level))

  return (
    <div>
      <Section title="Communities needing action">
        {needsAction.length === 0 ? (
          <Empty>
            No community is currently on watch or critical. Nothing to action right now.
          </Empty>
        ) : (
          <div className="space-y-3">
            {needsAction.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                checked={checked}
                onToggle={toggle}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

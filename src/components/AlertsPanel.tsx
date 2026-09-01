import { useEffect, useMemo, useState } from 'react'

import { api } from '../api/client'
import { dateTime, num, timeAgo } from '../lib/format'
import { useDashboard } from '../state/dashboard'
import type { Selection } from '../state/selection'
import type { Alert } from '../types'
import { DeliveryBadge, Empty, Section, StatusBadge } from './ui'

// Alert monitoring: what went out, to how many people, and did it land.
//
// Filtering goes back through `api.getAlerts()` rather than slicing an array
// already in memory. It costs nothing here and means the filter path is
// already exercising the real query interface a live backend will serve.

const inputClass =
  'rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none'

function Counter({
  label,
  value,
  tone = 'text-slate-100',
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2">
      <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  )
}

export function AlertsPanel({ onSelect }: { onSelect: (selection: Selection) => void }) {
  const { communities, communityById, summary } = useDashboard()

  const [communityId, setCommunityId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [results, setResults] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    api
      .getAlerts({
        communityId: communityId || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      .then((data) => {
        if (!cancelled) setResults(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [communityId, from, to])

  const filtered = useMemo(
    () =>
      [...results].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [results],
  )

  const recipientsShown = filtered.reduce((sum, a) => sum + a.recipients_count, 0)
  const isFiltered = Boolean(communityId || from || to)

  // Only communities that can actually generate alerts are worth offering.
  const liveCommunities = communities.filter((c) => c.coverage === 'live')

  return (
    <div>
      <Section title="Alert summary">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Counter label="Sent today" value={num(summary.alertsToday)} />
          <Counter label="This week" value={num(summary.alertsThisWeek)} />
          <Counter
            label="Households under alert"
            value={num(summary.householdsUnderActiveAlert)}
            tone={summary.householdsUnderActiveAlert ? 'text-amber-300' : 'text-slate-100'}
          />
        </div>
        {summary.failedAlertsThisWeek > 0 && (
          <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {num(summary.failedAlertsThisWeek)} message
            {summary.failedAlertsThisWeek === 1 ? '' : 's'} failed to deliver this week. Those
            households did not receive a warning.
          </p>
        )}
      </Section>

      <Section
        title="Filters"
        action={
          isFiltered && (
            <button
              type="button"
              onClick={() => {
                setCommunityId('')
                setFrom('')
                setTo('')
              }}
              className="text-xs text-sky-300 underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )
        }
      >
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs text-slate-400">Community</span>
            <select
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className={inputClass}
            >
              <option value="">All communities</option>
              {liveCommunities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">From</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">To</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </Section>

      <Section
        title={`Alert feed${isFiltered ? ' (filtered)' : ''}`}
        action={
          <span className="text-xs text-slate-500">
            {num(filtered.length)} alert{filtered.length === 1 ? '' : 's'} ·{' '}
            {num(recipientsShown)} recipients
          </span>
        }
      >
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-800/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty>No alerts match these filters.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((alert) => {
              const community = communityById.get(alert.community_id)
              return (
                <li
                  key={alert.id}
                  className={`rounded-lg border-l-2 border border-slate-800 bg-slate-800/40 px-3 py-2.5 ${
                    alert.risk_level === 'critical'
                      ? 'border-l-red-500'
                      : alert.risk_level === 'watch'
                        ? 'border-l-amber-500'
                        : 'border-l-emerald-500'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        onSelect({ kind: 'community', id: alert.community_id })
                      }
                      className="text-sm font-semibold text-slate-100 underline-offset-2 hover:underline"
                    >
                      {community?.name ?? alert.community_id}
                    </button>
                    <StatusBadge status={alert.risk_level} />
                    <span className="ml-auto text-xs text-slate-500">
                      {timeAgo(alert.timestamp)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">{alert.trigger}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span className="tabular-nums">{dateTime(alert.timestamp)}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">
                      {num(alert.recipients_count)} recipients
                    </span>
                    <DeliveryBadge status={alert.delivery_status} />
                    <span className="ml-auto font-mono text-[10px] text-slate-600">
                      {alert.id}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="About these figures">
        <p className="text-xs text-slate-500">
          Recipient counts are the number of enrolled phone numbers a message was addressed to, not
          the number of people who read it. Delivery status comes from the SMS gateway:{' '}
          <span className="text-slate-400">sent</span> means accepted by the carrier,{' '}
          <span className="text-slate-400">delivered</span> means the handset acknowledged receipt.
          {' '}A delivered message is still not proof anyone acted on it.
        </p>
      </Section>
    </div>
  )
}

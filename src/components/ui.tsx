import type { ReactNode } from 'react'

import { COVERAGE, DELIVERY, RISK } from '../lib/risk'
import type { Coverage, DeliveryStatus, NodeStatus } from '../types'

// Shared presentational pieces. Nothing here knows about flood data — they
// take a status or a label and render it consistently.

export function StatusBadge({
  status,
  full = false,
}: {
  status: NodeStatus
  /** Long label ("Elevated — watch") instead of the short one. */
  full?: boolean
}) {
  const style = RISK[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
      {full ? style.label : style.short}
    </span>
  )
}

export function CoverageBadge({ coverage }: { coverage: Coverage }) {
  const style = COVERAGE[coverage]
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style.badge}`}
    >
      {style.label}
    </span>
  )
}

export function DeliveryBadge({ status }: { status: DeliveryStatus }) {
  const style = DELIVERY[status]
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${style.badge}`}
    >
      {style.label}
    </span>
  )
}

/** A labelled number. `tone` tints the value when it needs to draw the eye. */
export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'warn' | 'danger' | 'good'
}) {
  const toneClass = {
    default: 'text-slate-100',
    good: 'text-emerald-300',
    warn: 'text-amber-300',
    danger: 'text-red-300',
  }[tone]

  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

export function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border-b border-slate-800 px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Label/value row — the workhorse of the detail panels. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-slate-100">{children}</dd>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
      {children}
    </div>
  )
}

/**
 * Marks values that are placeholders or estimates. Used liberally and on
 * purpose: an operator must be able to tell at a glance which numbers on this
 * screen are real and which are standing in for data that doesn't exist yet.
 */
export function Provisional({ children }: { children: ReactNode }) {
  return (
    <span
      className="ml-1.5 cursor-help rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-300 uppercase"
      title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </span>
  )
}

export function Bar({ pct, tone }: { pct: number; tone: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
      <div
        className={`h-full rounded-full ${tone}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

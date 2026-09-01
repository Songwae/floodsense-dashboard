import { useEffect, useRef, useState } from 'react'

import { Header } from './components/Header'
import { MapView } from './components/MapView'
import { SidePanel, type TabKey } from './components/SidePanel'
import { DashboardProvider } from './state/DashboardProvider'
import { useDashboard } from './state/dashboard'
import type { Selection } from './state/selection'

// Layout: map dominant, supporting panels beside it on desktop and stacked
// beneath it on tablets. The map never disappears — losing spatial context
// mid-incident is worse than a cramped panel.

function Dashboard() {
  const { loading, error, reload } = useDashboard()
  const [selection, setSelection] = useState<Selection>(null)
  const [tab, setTab] = useState<TabKey>('detail')

  // Clicking the map should show what was clicked, wherever the operator was.
  // Only on a *new* selection, so it doesn't yank them off a tab on deselect.
  const previous = useRef<Selection>(null)
  useEffect(() => {
    if (selection && selection !== previous.current) setTab('detail')
    previous.current = selection
  }, [selection])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-100">Could not load dashboard data</h2>
          <p className="mt-2 text-sm text-red-200/80">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-slate-400">Loading network status…</div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header onSelect={setSelection} />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="h-[46vh] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
          <MapView selection={selection} onSelect={setSelection} />
        </div>

        <aside className="min-h-0 flex-1 border-t border-slate-800 lg:w-[26rem] lg:flex-none lg:border-t-0 lg:border-l">
          <SidePanel
            tab={tab}
            onTabChange={setTab}
            selection={selection}
            onSelect={setSelection}
          />
        </aside>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <DashboardProvider>
      <Dashboard />
    </DashboardProvider>
  )
}

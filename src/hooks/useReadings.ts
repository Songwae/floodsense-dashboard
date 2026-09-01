import { useEffect, useState } from 'react'

import { api } from '../api/client'
import type { Reading } from '../types'

/**
 * Readings for one node over a window of days. Fetched through the API layer
 * rather than reaching into the mock modules, so this keeps working unchanged
 * once a real backend is wired up.
 */
export function useReadings(nodeId: string | null, days: number) {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!nodeId) {
      setReadings([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    api
      .getReadings(nodeId, days)
      .then((data) => {
        if (!cancelled) setReadings(data)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load readings')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [nodeId, days])

  return { readings, loading, error }
}

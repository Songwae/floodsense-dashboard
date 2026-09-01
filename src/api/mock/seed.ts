// Deterministic generators for the mock dataset.
//
// Everything here is seeded. A pitch demo that reshuffles itself on every
// refresh is worse than useless — the presenter needs the same numbers on
// screen as the ones they just described out loud.

import type { LatLng } from '../../types'

/** mulberry32 — small, fast, good enough for plausible-looking data. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable numeric seed from a string id, so seeds survive renaming nodes. */
export function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const KM_PER_DEG_LAT = 110.574

function kmPerDegLng(lat: number): number {
  return 111.32 * Math.cos((lat * Math.PI) / 180)
}

/**
 * A smooth, irregular closed ring around a point — the predicted flood extent.
 *
 * This is deliberately a placeholder shape, not a hydrological result. Real
 * flood extent depends on terrain, drainage capacity and built surface, none
 * of which this models. It exists so the map has the right *structure*: when
 * surveyed or model-derived coordinates arrive they drop straight into
 * `Community.polygon_coords` and nothing else changes.
 */
export function extentRing(
  lat: number,
  lng: number,
  radiusKm: number,
  seed: number,
  points = 48,
): LatLng[] {
  const r = rng(seed)
  // Low-frequency harmonics keep the outline blobby rather than spiky.
  const phase = [r() * Math.PI * 2, r() * Math.PI * 2, r() * Math.PI * 2]
  const ring: LatLng[] = []

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * Math.PI * 2
    const wobble =
      1 +
      0.18 * Math.sin(2 * theta + phase[0]) +
      0.11 * Math.sin(3 * theta + phase[1]) +
      0.06 * Math.sin(5 * theta + phase[2])
    const rad = radiusKm * wobble
    ring.push([
      lat + (rad * Math.sin(theta)) / KM_PER_DEG_LAT,
      lng + (rad * Math.cos(theta)) / kmPerDegLng(lat),
    ])
  }

  return ring
}

/** Offset a point by a distance in km — used to scatter nodes within a community. */
export function offsetKm(lat: number, lng: number, dLatKm: number, dLngKm: number): [number, number] {
  return [lat + dLatKm / KM_PER_DEG_LAT, lng + dLngKm / kmPerDegLng(lat)]
}

/**
 * The clock the whole mock dataset is generated against.
 *
 * Captured once at module load so every series, alert and event agrees on when
 * "now" is. Real backends will send absolute timestamps and this disappears.
 */
export const NOW = Date.now()

export const HOUR_MS = 3_600_000
export const DAY_MS = 24 * HOUR_MS

/** Snap to the top of the hour so generated series land on clean boundaries. */
export const NOW_HOUR = Math.floor(NOW / HOUR_MS) * HOUR_MS

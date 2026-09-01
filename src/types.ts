// Wire format for the FloodSense backend.
//
// These types describe what the API returns, not what the UI happens to need
// today. When the mock layer in `src/api/mock/` is replaced by real sensor
// feeds, these are the contract the real backend has to satisfy — nothing in
// `src/components/` should need to change.
//
// Timestamps are ISO 8601 strings throughout so they survive JSON transport.

export type RiskLevel = 'normal' | 'watch' | 'critical'

/** A node that hasn't checked in is its own operational state, not a risk level. */
export type NodeStatus = RiskLevel | 'offline'

/**
 * Whether a community has hardware in the ground yet. Planned communities
 * carry no nodes, readings, or alerts — they are drawn on the map to show
 * where coverage is going next.
 */
export type Coverage = 'live' | 'planned'

export interface Node {
  id: string
  community_id: string
  name: string
  lat: number
  lng: number
  status: NodeStatus
  last_reading_cm: number
  last_reading_time: string
  battery_pct: number
  /** Present when the node has a solar panel; null for mains/battery-only units. */
  solar_charging: boolean | null
  /**
   * Water level at which this node moves to `watch` / `critical`. Thresholds
   * are per-node because channel depth differs between sites — a reading of
   * 180cm is routine in one drain and an evacuation trigger in another.
   */
  threshold_watch_cm: number
  threshold_critical_cm: number
}

/** A [lat, lng] pair, in the order Leaflet expects. */
export type LatLng = [number, number]

export interface Community {
  id: string
  name: string
  district: string
  households: number
  /** Whether `households` is a verified count or a working estimate. */
  households_verified: boolean
  /** Centre point, used for map focus and for the predicted-extent overlay. */
  lat: number
  lng: number
  /**
   * Predicted flood extent. Currently a radius-derived ring around the
   * community centre; the shape is a placeholder for real GIS flood-extent
   * modelling and can be swapped for surveyed coordinates without code changes.
   */
  polygon_coords: LatLng[]
  coverage: Coverage
  current_risk_level: RiskLevel
  shelter_name: string
  shelter_lat: number
  shelter_lng: number
  nadmo_contact: string
  nadmo_office: string
  /** Health facility to notify — part of the mitigation checklist. */
  health_facility: string
}

export type DeliveryStatus = 'sent' | 'delivered' | 'failed'

export interface Alert {
  id: string
  community_id: string
  timestamp: string
  risk_level: RiskLevel
  recipients_count: number
  delivery_status: DeliveryStatus
  /** Human-readable trigger, e.g. "ADT-02 crossed 210cm". */
  trigger: string
}

export interface Reading {
  node_id: string
  timestamp: string
  water_level_cm: number
  /** Rainfall in the hour ending at `timestamp`. Null if the node has no gauge. */
  rainfall_mm: number | null
}

/**
 * The accuracy track record. Every prediction is logged with what actually
 * happened, including the ones that were wrong — that honesty is the point,
 * and it is what NADMO will ask to see before trusting an automated warning.
 */
export interface FloodEvent {
  id: string
  community_id: string
  predicted_at: string
  predicted_risk_level: RiskLevel
  /** Did flooding actually occur? Null while an event is still unresolved. */
  materialised: boolean | null
  peak_level_cm: number | null
  notes: string
}

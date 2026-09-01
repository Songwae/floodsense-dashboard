import type { FloodEvent } from '../../types'
import { DAY_MS, NOW_HOUR } from './seed'

// The prediction accuracy log.
//
// Entries are manually written today — a coordinator records what the system
// predicted and what actually happened. The misses are in here deliberately:
// two false alarms and one event the system called late. A track record with
// no failures in it is not a track record, and NADMO will read this table
// before it trusts an automated warning.

function daysAgo(d: number): string {
  return new Date(NOW_HOUR - d * DAY_MS).toISOString()
}

export const floodEvents: FloodEvent[] = [
  {
    id: 'EVT-012',
    community_id: 'adenta',
    predicted_at: daysAgo(0.1),
    predicted_risk_level: 'watch',
    materialised: null,
    peak_level_cm: null,
    notes:
      'Ongoing. Levels elevated after the afternoon storm; ADT-02 above watch threshold. Outcome not yet recorded.',
  },
  {
    id: 'EVT-011',
    community_id: 'adenta',
    predicted_at: daysAgo(2.2),
    predicted_risk_level: 'critical',
    materialised: true,
    peak_level_cm: 251,
    notes:
      'Localised flooding along the Housing Down drain. Six households reported water entry. Assembly point opened; no injuries. Warning issued 42 minutes before onset.',
  },
  {
    id: 'EVT-010',
    community_id: 'madina',
    predicted_at: daysAgo(2.4),
    predicted_risk_level: 'watch',
    materialised: false,
    peak_level_cm: 163,
    notes:
      'FALSE ALARM. Level crossed the watch threshold but drainage cleared it within the hour. No flooding. Watch threshold for MAD-01 may be set too low.',
  },
  {
    id: 'EVT-009',
    community_id: 'adenta',
    predicted_at: daysAgo(4.1),
    predicted_risk_level: 'watch',
    materialised: true,
    peak_level_cm: 197,
    notes:
      'Minor street flooding at the SDA junction, cleared in about three hours. No property damage reported.',
  },
  {
    id: 'EVT-008',
    community_id: 'madina',
    predicted_at: daysAgo(5.4),
    predicted_risk_level: 'watch',
    materialised: true,
    peak_level_cm: 181,
    notes: 'Market storm drain overtopped briefly. Traders moved goods in time.',
  },
  {
    id: 'EVT-007',
    community_id: 'adenta',
    predicted_at: daysAgo(6.2),
    predicted_risk_level: 'critical',
    materialised: true,
    peak_level_cm: 244,
    notes:
      'Flooding confirmed. Warning went out roughly 20 minutes AFTER water started entering compounds — too late to be useful. Rise was faster than the model expected.',
  },
  {
    id: 'EVT-006',
    community_id: 'adenta',
    predicted_at: daysAgo(8.6),
    predicted_risk_level: 'watch',
    materialised: false,
    peak_level_cm: 172,
    notes:
      'FALSE ALARM. Rain stopped earlier than forecast. Community volunteers stood down after 90 minutes.',
  },
  {
    id: 'EVT-005',
    community_id: 'madina',
    predicted_at: daysAgo(10.3),
    predicted_risk_level: 'watch',
    materialised: true,
    peak_level_cm: 176,
    notes: 'Standing water at Zongo junction for about two hours. No evacuation needed.',
  },
  {
    id: 'EVT-004',
    community_id: 'adenta',
    predicted_at: daysAgo(12.8),
    predicted_risk_level: 'watch',
    materialised: true,
    peak_level_cm: 189,
    notes: 'Drain overtopped at the barrier culvert. Cleared without intervention.',
  },
  {
    id: 'EVT-003',
    community_id: 'adenta',
    predicted_at: daysAgo(17.5),
    predicted_risk_level: 'critical',
    materialised: true,
    peak_level_cm: 263,
    notes:
      'Most severe event in the log. Eleven households affected, four sheltered overnight at the community centre. Warning issued 55 minutes ahead.',
  },
  {
    id: 'EVT-002',
    community_id: 'madina',
    predicted_at: daysAgo(21.1),
    predicted_risk_level: 'watch',
    materialised: false,
    peak_level_cm: 158,
    notes: 'FALSE ALARM. Brief spike traced to debris blocking the culvert, cleared manually.',
  },
  {
    id: 'EVT-001',
    community_id: 'adenta',
    predicted_at: daysAgo(26.7),
    predicted_risk_level: 'watch',
    materialised: true,
    peak_level_cm: 193,
    notes: 'First recorded event after node commissioning. Minor street flooding only.',
  },
]

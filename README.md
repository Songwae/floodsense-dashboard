# FloodSense Ghana — NADMO Operations Dashboard

An operational dashboard for NADMO and partner institutions to monitor flood risk
across FloodSense-covered communities in Greater Accra. Built for use during an
active flood event: the map is the primary view, status is readable at a glance,
and the "Respond" tab answers *what do we do right now*.

This is a decision-support tool for responders, not a public-facing app.

---

## ⚠️ Everything on screen is demo data

No backend is connected. Every water level, alert, delivery receipt and flood
event is **generated** — plausible in shape, but not real. The header carries a
permanent `DEMO DATA` badge while this is the case.

Data that is a placeholder rather than a measurement is marked inline:

| Marked | Meaning |
| --- | --- |
| `EST.` | Household counts are working estimates, not verified survey or census counts |
| `UNCONFIRMED` | Shelter / assembly point locations are placeholders pending NADMO confirmation |
| `PLACEHOLDER` | NADMO district phone numbers are deliberately non-dialable stand-ins |

Phone numbers are **not** rendered as `tel:` links while they are placeholders —
a one-tap call to a stranger during an incident is not an acceptable bug. Enable
the link in `src/components/MitigationPanel.tsx` once the real district directory
is in place.

The **flood event log** deliberately includes false alarms and one warning that
went out too late. A prediction track record with no failures in it cannot be
audited, and NADMO will want to see the misses before trusting an automated
warning.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle into dist/
```

Node 20+ required.

## Swapping in the real backend

Every component talks to `api` from [`src/api/client.ts`](src/api/client.ts) and
nothing imports the mock modules directly. Two implementations satisfy the same
`FloodSenseApi` interface:

- `mockApi` — generated demo data (default)
- `httpApi` — plain REST calls

Point the dashboard at a live backend with one environment variable:

```bash
# .env
VITE_API_BASE_URL=https://api.example.org/v1
```

The `DEMO DATA` badge disappears automatically once a URL is set. Expected routes:

| Method | Route | Returns |
| --- | --- | --- |
| `GET` | `/communities` | `Community[]` |
| `GET` | `/nodes` | `Node[]` |
| `GET` | `/alerts?community_id=&from=&to=` | `Alert[]` |
| `GET` | `/nodes/:id/readings?days=` | `Reading[]` |
| `GET` | `/events` | `FloodEvent[]` |

If the real backend's routes or field names differ, `httpApi` is the single
place to adjust — no component changes. The wire format is defined in
[`src/types.ts`](src/types.ts).

## Features

- **Interactive map** — Leaflet + OpenStreetMap tiles (no API key, no billing).
  Status-coloured sensor markers, translucent predicted-flood-extent polygons per
  community, and dashed indigo outlines for planned coverage. Dark and daylight
  basemaps, because a dark map is unreadable on a tablet in direct sun.
- **Alert monitoring** — full SMS alert feed with community and date-range
  filters, delivery status, and counters for today / this week / households under
  an active alert. Failed deliveries are called out, not buried.
- **Mitigation support** — for every community on watch or critical: households at
  risk, nearest assembly point with distance, emergency contacts, and a tickable
  action checklist scaled to the risk level.
- **History** — 7/30-day water level per node with rainfall overlay and threshold
  reference lines, plus the flood event accuracy log.
- **Overview header** — coverage counts, nodes reporting vs offline, and a
  system-wide status banner that is legible from across a room.

### Simulate critical event

The header toggle escalates Adenta to critical so the critical-path UI can be
demonstrated on stage. While it is on, a magenta **SIMULATED EVENT — NOT REAL
DATA** banner is pinned to the status bar. It only ever rewrites data at the edge
of the store (`src/state/DashboardProvider.tsx`).

## Accessibility & field use

Colour is never the only status signal. Every status carries a text label,
critical markers are larger and pulse, offline markers are hollow rings, and the
pulse animation respects `prefers-reduced-motion`. Layout is side-by-side on
desktop and stacks map-above-panels on tablets.

## Seed communities

| Community | Households (est.) | Coverage | Demo status |
| --- | --- | --- | --- |
| Adenta | 380 | Live — 4 nodes | Watch |
| Madina | 278 | Live — 3 nodes | Normal |
| Alajo | 450 | Planned | — |
| Dansoman | 600 | Planned | — |
| Kaneshie | 500 | Planned | — |

Household figures are sized against the ~658 households already engaged across
Adenta and Madina. Coordinates are approximate neighbourhood centres.

"Dansoman" is spelled as intended — a large, genuinely flood-prone residential
area in Ablekuma West, south-west Accra. No substitution was made.

## Known limitations

- **Flood extent polygons are indicative shapes**, derived from a centre point and
  radius. They are not hydrological output — real extent depends on terrain,
  drainage capacity and built surface, none of which is modelled here. They exist
  so the map has the right structure for surveyed or model-derived coordinates to
  drop into `Community.polygon_coords`.
- **Shelter distances are straight-line**, not road distances.
- **Checklist ticks are local to the browser session** and are not shared between
  responders. Multi-user incident state needs a backend.
- **The bundle is ~234 kB gzipped**, dominated by Recharts and Leaflet. Worth
  code-splitting the chart panels if this is to be used over slow mobile data.

## Stack

React 19 · TypeScript · Vite · Leaflet + react-leaflet · Recharts · Tailwind CSS v4

import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet'

import { ACCRA_CENTER, ACCRA_ZOOM } from '../api/mock/communities'
import { COVERAGE, RISK, isActionable } from '../lib/risk'
import { timeAgo } from '../lib/format'
import { useDashboard } from '../state/dashboard'
import type { Selection } from '../state/selection'
import type { Community, Node, NodeStatus } from '../types'

// The map is the primary view — everything else on screen supports it.

/**
 * Two OpenStreetMap-derived basemaps, neither of which needs an API key or a
 * billing account. Dark is the default for control-room use; light exists
 * because a dark map is close to unreadable on a tablet in direct sunlight,
 * which is exactly where regional staff will be using this.
 */
const BASEMAPS = {
  dark: {
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  light: {
    label: 'Daylight',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
} as const

type BasemapKey = keyof typeof BASEMAPS

/**
 * Node markers are div icons rather than image pins, so status colour, size
 * and the critical pulse are all driven from one place with no sprite assets.
 *
 * Colour is never the only signal: critical markers are larger and pulse,
 * offline markers are hollow, and every marker carries a text tooltip.
 */
function nodeIcon(status: NodeStatus, selected: boolean): L.DivIcon {
  const { hex } = RISK[status]
  const size = status === 'critical' ? 20 : 16
  const dot = status === 'critical' ? 13 : 10

  const pulse =
    status === 'critical'
      ? `<span class="node-pulse" style="position:absolute;inset:0;border-radius:9999px;background:${hex}"></span>`
      : ''

  // Offline reads as a hollow ring — visibly "no signal" rather than a colour
  // someone has to remember the meaning of.
  const fill = status === 'offline' ? 'transparent' : hex
  const borderWidth = status === 'offline' ? 2.5 : 2

  return L.divIcon({
    className: 'node-marker',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
        ${pulse}
        <span style="
          position:relative;
          display:block;
          width:${dot}px;height:${dot}px;
          border-radius:9999px;
          background:${fill};
          border:${borderWidth}px solid ${selected ? '#ffffff' : hex};
          box-shadow:0 0 0 1.5px rgba(2,6,23,.85)${selected ? `, 0 0 10px 3px ${hex}` : ''};
        "></span>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** Small square marker for shelters and assembly points. */
function shelterIcon(): L.DivIcon {
  return L.divIcon({
    className: 'node-marker',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px">
        <span style="
          display:block;width:11px;height:11px;
          background:#38bdf8;
          border:2px solid #0f172a;
          box-shadow:0 0 0 1.5px #38bdf8;
        "></span>
      </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

/**
 * Leaflet measures its container once at init and caches the result. If it
 * initialises before layout settles — or the container changes size when the
 * layout flips between the tablet and desktop breakpoints — it keeps drawing
 * for the old size and requests only the handful of tiles it thinks it needs,
 * leaving most of the map blank. Watching the element and invalidating on any
 * change is the reliable fix.
 */
function InvalidateOnResize() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    // Also flush once after mount, for the initial zero-size case.
    map.invalidateSize()
    return () => observer.disconnect()
  }, [map])

  return null
}

/** Clicking bare map is the natural "deselect" gesture. */
function DeselectOnMapClick({ onDeselect }: { onDeselect: () => void }) {
  useMapEvents({ click: onDeselect })
  return null
}

/** Pans the map when the selection changes, without fighting the user's zoom. */
function MapFocus({ target }: { target: [number, number] | null }) {
  const map = useMap()

  useEffect(() => {
    if (!target) return
    map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.6 })
  }, [target, map])

  return null
}

function CommunityShape({
  community,
  nodes,
  selected,
  onSelect,
}: {
  community: Community
  nodes: Node[]
  selected: boolean
  onSelect: () => void
}) {
  const planned = community.coverage === 'planned'
  const color = planned ? COVERAGE.planned.hex : RISK[community.current_risk_level].hex

  // Planned zones are drawn as dashed outlines with almost no fill: they show
  // where coverage is heading without reading as live risk information.
  return (
    <Polygon
      positions={community.polygon_coords}
      eventHandlers={{ click: onSelect }}
      pathOptions={{
        color,
        weight: selected ? 3 : planned ? 1.5 : 2,
        opacity: planned ? 0.75 : 0.9,
        dashArray: planned ? '6 6' : undefined,
        fillColor: color,
        fillOpacity: planned ? 0.05 : isActionable(community.current_risk_level) ? 0.22 : 0.12,
      }}
    >
      <Tooltip direction="top" sticky>
        <div className="font-semibold">{community.name}</div>
        <div className="text-slate-300">
          {planned
            ? 'Planned coverage — no sensors installed'
            : `${RISK[community.current_risk_level].label} · ${nodes.length} node${nodes.length === 1 ? '' : 's'}`}
        </div>
        <div className="text-slate-400">Predicted flood extent (indicative)</div>
      </Tooltip>
    </Polygon>
  )
}

export function MapView({
  selection,
  onSelect,
}: {
  selection: Selection
  onSelect: (selection: Selection) => void
}) {
  const { communities, nodes, nodesByCommunity, communityById, nodeById } = useDashboard()
  const [basemap, setBasemap] = useState<BasemapKey>('dark')

  const focus = useMemo<[number, number] | null>(() => {
    if (!selection) return null
    if (selection.kind === 'node') {
      const node = nodeById.get(selection.id)
      return node ? [node.lat, node.lng] : null
    }
    const community = communityById.get(selection.id)
    return community ? [community.lat, community.lng] : null
  }, [selection, nodeById, communityById])

  // Shelters are only worth plotting where somebody may actually need one.
  const shelterCommunities = communities.filter(
    (c) =>
      c.coverage === 'live' &&
      (isActionable(c.current_risk_level) ||
        (selection?.kind === 'community' && selection.id === c.id)),
  )

  const tiles = BASEMAPS[basemap]

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={ACCRA_CENTER}
        zoom={ACCRA_ZOOM}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer key={basemap} url={tiles.url} attribution={tiles.attribution} />
        <ZoomControl position="topright" />
        <InvalidateOnResize />
        <DeselectOnMapClick onDeselect={() => onSelect(null)} />

        {communities.map((community) => (
          <CommunityShape
            key={community.id}
            community={community}
            nodes={nodesByCommunity.get(community.id) ?? []}
            selected={selection?.kind === 'community' && selection.id === community.id}
            onSelect={() => onSelect({ kind: 'community', id: community.id })}
          />
        ))}

        {shelterCommunities.map((community) => (
          <Marker
            key={`shelter-${community.id}`}
            position={[community.shelter_lat, community.shelter_lng]}
            icon={shelterIcon()}
            eventHandlers={{ click: () => onSelect({ kind: 'community', id: community.id }) }}
          >
            <Tooltip direction="top">
              <div className="font-semibold">{community.shelter_name}</div>
              <div className="text-slate-400">Assembly point · location unconfirmed</div>
            </Tooltip>
          </Marker>
        ))}

        {nodes.map((node) => (
          <Marker
            key={node.id}
            position={[node.lat, node.lng]}
            icon={nodeIcon(node.status, selection?.kind === 'node' && selection.id === node.id)}
            eventHandlers={{ click: () => onSelect({ kind: 'node', id: node.id }) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div className="font-semibold">
                {node.id} · {RISK[node.status].short}
              </div>
              <div className="text-slate-300">{node.name}</div>
              <div className="text-slate-400">
                {node.status === 'offline'
                  ? `No reading for ${timeAgo(node.last_reading_time)}`
                  : `${node.last_reading_cm} cm · ${timeAgo(node.last_reading_time)}`}
              </div>
            </Tooltip>
          </Marker>
        ))}

        <MapFocus target={focus} />
      </MapContainer>

      <MapLegend basemap={basemap} onBasemapChange={setBasemap} />
    </div>
  )
}

function MapLegend({
  basemap,
  onBasemapChange,
}: {
  basemap: BasemapKey
  onBasemapChange: (key: BasemapKey) => void
}) {
  const items: { status: NodeStatus; label: string }[] = [
    { status: 'normal', label: 'Normal' },
    { status: 'watch', label: 'Watch' },
    { status: 'critical', label: 'Critical' },
    { status: 'offline', label: 'Offline' },
  ]

  return (
    <div className="pointer-events-none absolute bottom-6 left-3 z-[1000] flex flex-col gap-2">
      <div className="pointer-events-auto rounded-lg border border-slate-700 bg-slate-900/90 p-3 shadow-xl backdrop-blur">
        <div className="mb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Sensor nodes
        </div>
        <ul className="space-y-1.5">
          {items.map(({ status, label }) => (
            <li key={status} className="flex items-center gap-2 text-xs text-slate-200">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: status === 'offline' ? 'transparent' : RISK[status].hex,
                  border: `2px solid ${RISK[status].hex}`,
                }}
                aria-hidden
              />
              {label}
            </li>
          ))}
        </ul>

        <div className="mt-3 mb-2 border-t border-slate-700 pt-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Zones
        </div>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2 text-xs text-slate-200">
            <span className="h-2.5 w-4 shrink-0 rounded-sm border border-amber-400 bg-amber-400/25" aria-hidden />
            Predicted flood extent
          </li>
          <li className="flex items-center gap-2 text-xs text-slate-200">
            <span
              className="h-2.5 w-4 shrink-0 rounded-sm border border-dashed border-indigo-400 bg-indigo-400/10"
              aria-hidden
            />
            Planned coverage
          </li>
          <li className="flex items-center gap-2 text-xs text-slate-200">
            <span className="h-2.5 w-2.5 shrink-0 border-2 border-slate-900 bg-sky-400 ring-1 ring-sky-400" aria-hidden />
            Assembly point
          </li>
        </ul>
      </div>

      <div className="pointer-events-auto inline-flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900/90 shadow-xl backdrop-blur">
        {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onBasemapChange(key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              basemap === key
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {BASEMAPS[key].label}
          </button>
        ))}
      </div>
    </div>
  )
}

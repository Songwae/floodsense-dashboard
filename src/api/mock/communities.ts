import type { Community } from '../../types'
import { extentRing, hashSeed } from './seed'

// Seed communities for the demo.
//
// HONESTY NOTES — these matter more than the code:
//
// * Household figures are working estimates, not census or survey counts.
//   `households_verified: false` drives an "est." marker everywhere they are
//   shown. Flip the flag per community as verified numbers come in.
// * Shelter names and NADMO phone numbers are PLACEHOLDERS. The numbers are
//   deliberately non-dialable so nobody calls a stranger mid-demo. The UI
//   labels them as unconfirmed; replace with NADMO's real district directory
//   before this is ever used operationally.
// * Coordinates are approximate neighbourhood centres, good enough to place a
//   marker in the right part of Accra, not surveyed positions.
//
// "Dansoman" is spelled correctly — it is a large residential area in Ablekuma
// West, south-west Accra, and is genuinely flood-prone. No substitution made.

interface CommunitySeed {
  id: string
  name: string
  district: string
  households: number
  lat: number
  lng: number
  /** Rough radius of the predicted-extent overlay, in km. */
  extentKm: number
  coverage: 'live' | 'planned'
  currentRisk: 'normal' | 'watch' | 'critical'
  shelterName: string
  shelterLat: number
  shelterLng: number
  nadmoOffice: string
  nadmoContact: string
  healthFacility: string
}

const SEEDS: CommunitySeed[] = [
  {
    id: 'adenta',
    name: 'Adenta',
    district: 'Adentan Municipal',
    households: 380,
    lat: 5.7089,
    lng: -0.1683,
    extentKm: 1.5,
    coverage: 'live',
    currentRisk: 'watch',
    shelterName: 'Adenta Community Centre',
    shelterLat: 5.7042,
    shelterLng: -0.1731,
    nadmoOffice: 'Adentan Municipal NADMO Office',
    nadmoContact: '+233 30 000 0101',
    healthFacility: 'Adentan Municipal Health Directorate',
  },
  {
    id: 'madina',
    name: 'Madina',
    district: 'La Nkwantanang-Madina Municipal',
    households: 278,
    lat: 5.6836,
    lng: -0.1664,
    extentKm: 1.3,
    coverage: 'live',
    currentRisk: 'normal',
    shelterName: 'Madina Social Welfare Hall',
    shelterLat: 5.6881,
    shelterLng: -0.1622,
    nadmoOffice: 'La Nkwantanang-Madina Municipal NADMO Office',
    nadmoContact: '+233 30 000 0102',
    healthFacility: 'Madina Polyclinic',
  },

  // --- Planned expansion: no hardware in the ground yet ----------------------
  {
    id: 'alajo',
    name: 'Alajo',
    district: 'Ayawaso North Municipal',
    households: 450,
    lat: 5.5926,
    lng: -0.2118,
    extentKm: 1.2,
    coverage: 'planned',
    currentRisk: 'normal',
    shelterName: 'Alajo Community Centre',
    shelterLat: 5.5959,
    shelterLng: -0.2154,
    nadmoOffice: 'Ayawaso North Municipal NADMO Office',
    nadmoContact: '+233 30 000 0103',
    healthFacility: 'Kotobabi Polyclinic',
  },
  {
    id: 'dansoman',
    name: 'Dansoman',
    district: 'Ablekuma West Municipal',
    households: 600,
    lat: 5.54,
    lng: -0.256,
    extentKm: 1.9,
    coverage: 'planned',
    currentRisk: 'normal',
    shelterName: 'Dansoman Community Centre',
    shelterLat: 5.5361,
    shelterLng: -0.2604,
    nadmoOffice: 'Ablekuma West Municipal NADMO Office',
    nadmoContact: '+233 30 000 0104',
    healthFacility: 'Dansoman Polyclinic',
  },
  {
    id: 'kaneshie',
    name: 'Kaneshie',
    district: 'Okaikwei South Municipal',
    households: 500,
    lat: 5.5626,
    lng: -0.234,
    extentKm: 1.4,
    coverage: 'planned',
    currentRisk: 'normal',
    shelterName: 'Kaneshie Community Centre',
    shelterLat: 5.5658,
    shelterLng: -0.2381,
    nadmoOffice: 'Okaikwei South Municipal NADMO Office',
    nadmoContact: '+233 30 000 0105',
    healthFacility: 'Kaneshie Polyclinic',
  },
]

export const communities: Community[] = SEEDS.map((s) => ({
  id: s.id,
  name: s.name,
  district: s.district,
  households: s.households,
  households_verified: false,
  lat: s.lat,
  lng: s.lng,
  polygon_coords: extentRing(s.lat, s.lng, s.extentKm, hashSeed(s.id)),
  coverage: s.coverage,
  current_risk_level: s.currentRisk,
  shelter_name: s.shelterName,
  shelter_lat: s.shelterLat,
  shelter_lng: s.shelterLng,
  nadmo_contact: s.nadmoContact,
  nadmo_office: s.nadmoOffice,
  health_facility: s.healthFacility,
}))

export const communityById = new Map(communities.map((c) => [c.id, c]))

/** Map focus: centred between Adenta in the north-east and Dansoman in the south-west. */
export const ACCRA_CENTER: [number, number] = [5.625, -0.205]
export const ACCRA_ZOOM = 12

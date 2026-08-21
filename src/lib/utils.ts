import type {
  ListingType, PropertyType, FurnishingStatus, PriceUnit,
  ListedBy, ApprovalAuthority, OwnershipType, SoilType, WaterSource, ElectricService,
} from '@/types'
import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) { return clsx(inputs) }

export function formatPrice(price: number, unit: PriceUnit = 'TOTAL'): string {
  const f = price >= 10_000_000
    ? `₹${(price / 10_000_000).toFixed(2)} Cr`
    : price >= 100_000
    ? `₹${(price / 100_000).toFixed(2)} Lac`
    : `₹${price.toLocaleString('en-IN')}`
  if (unit === 'PER_MONTH') return `${f}/mo`
  if (unit === 'PER_SQFT')  return `${f}/sqft`
  return f
}

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  SALE: 'For sale', RENT: 'For rent', PG: 'PG / Co-living',
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: 'Apartment', INDEPENDENT_HOUSE: 'Independent house', VILLA: 'Villa',
  PLOT: 'Plot', COMMERCIAL_OFFICE: 'Commercial office', COMMERCIAL_SHOP: 'Commercial shop',
  BUILDER_FLOOR: 'Builder floor', PG_HOSTEL: 'PG / Hostel',
  AGRICULTURAL_LAND: 'Agricultural land', WAREHOUSE: 'Warehouse',
}

export const FURNISHING_LABELS: Record<FurnishingStatus, string> = {
  UNFURNISHED: 'Unfurnished', SEMI_FURNISHED: 'Semi-furnished', FULLY_FURNISHED: 'Fully furnished',
}

export function listingTypeBadgeClass(type: ListingType): string {
  return { SALE: 'bg-green-50 text-green-800 border border-green-200', RENT: 'bg-brand-50 text-brand-800 border border-brand-200', PG: 'bg-purple-50 text-purple-800 border border-purple-200' }[type]
}

// ── Phase B enum label maps ────────────────────────────────
export const LISTED_BY_LABELS: Record<ListedBy, string> = {
  OWNER: 'Owner', PROMOTER: 'Promoter / Builder', AGENT: 'Agent',
}
export const APPROVAL_AUTHORITY_LABELS: Record<ApprovalAuthority, string> = {
  DTCP: 'DTCP approved', CMDA: 'CMDA approved', TNHB: 'TNHB', CMA: 'CMA',
  RERA: 'RERA registered', LOCAL: 'Local body approved', OTHER: 'Other', NONE: 'Unapproved',
}
export const OWNERSHIP_TYPE_LABELS: Record<OwnershipType, string> = {
  SINGLE: 'Single owner', JOINT: 'Joint ownership', GIFT: 'Gift deed',
  INHERITED: 'Inherited', COMPANY: 'Company-owned', TRUST: 'Trust-owned',
}
export const SOIL_TYPE_LABELS: Record<SoilType, string> = {
  RED: 'Red soil', BLACK: 'Black soil', ALLUVIAL: 'Alluvial', LATERITE: 'Laterite',
  SANDY: 'Sandy', CLAY: 'Clay', LOAM: 'Loam', OTHER: 'Other',
}
export const WATER_SOURCE_LABELS: Record<WaterSource, string> = {
  BOREWELL: 'Borewell', OPEN_WELL: 'Open well', CANAL: 'Canal',
  RIVER: 'River', RAIN_FED: 'Rain-fed', NONE: 'None',
}
export const ELECTRIC_SERVICE_LABELS: Record<ElectricService, string> = {
  AVAILABLE_3PHASE: '3-phase connection', AVAILABLE_1PHASE: '1-phase connection',
  AGRI_CONNECTION: 'Agricultural connection', NONE: 'No connection',
}

/** Renders a nullable boolean as Yes / No / — for spec rows. */
export function yesNo(v: boolean | null | undefined): string {
  return v == null ? '—' : v ? 'Yes' : 'No'
}

export function bedroomLabel(bedrooms: number | null): string {
  if (bedrooms === null) return ''
  return bedrooms === 0 ? 'Studio' : `${bedrooms} BHK`
}

export function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

// Sage-tinted 8x8 blur placeholder for next/image — fills the frame until the
// real photo loads instead of a blank pop-in. One shared constant; remote R2
// images can't have per-image blurDataURLs without a build-time pipeline.
export const IMAGE_BLUR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVR4nGO4//QGVsQwtCQAQlenAWbDP3YAAAAASUVORK5CYII='

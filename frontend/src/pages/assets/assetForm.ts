import { CATEGORIES, CONDITIONS } from '@/api/assets.api'
import type { AssetCategory, AssetWrite, OfficeAsset } from '@/api/assets.api'
import { localToday } from './assetHelpers'

/** Every value the register / edit form holds, as typed. */
export interface AssetFormValues {
  name: string
  category: AssetCategory
  condition: OfficeAsset['condition']
  location: string
  brand: string
  model: string
  serialNumber: string
  registrationNumber: string
  insuranceUntil: string
  supplier: string
  invoiceNumber: string
  purchaseDate: string
  purchaseCost: string
  warrantyUntil: string
  serviceDue: string
  documentUrl: string
  photoUrl: string
  notes: string
  reason: string
}
export type AssetField = keyof AssetFormValues
export type AssetErrors = Partial<Record<AssetField, string>>

const OPTIONAL: AssetField[] = ['brand', 'model', 'serialNumber', 'registrationNumber', 'insuranceUntil', 'supplier', 'invoiceNumber', 'purchaseDate', 'purchaseCost', 'warrantyUntil', 'serviceDue', 'documentUrl', 'photoUrl', 'notes']

export const FIELD_LABELS: Record<AssetField, string> = {
  name: 'Asset name', category: 'Category', condition: 'Condition', location: 'Location',
  brand: 'Brand', model: 'Model', serialNumber: 'Serial number', registrationNumber: 'Vehicle registration',
  insuranceUntil: 'Insurance until', supplier: 'Supplier', invoiceNumber: 'Invoice number',
  purchaseDate: 'Purchase date', purchaseCost: 'Purchase cost', warrantyUntil: 'Warranty until',
  serviceDue: 'Next service due', documentUrl: 'Document link', photoUrl: 'Photo link', notes: 'Notes', reason: 'Reason',
}

/** Placeholder names that read like the things this office actually owns. */
export const NAME_EXAMPLES: Record<AssetCategory, string> = {
  furniture: 'e.g. Executive desk, 3-seater sofa',
  computer: 'e.g. HP ProDesk 400 workstation',
  laptop: 'e.g. Dell Latitude 5440',
  printer: 'e.g. Canon imageRUNNER 2206',
  vehicle: 'e.g. Mahindra Bolero site vehicle',
  office_equipment: 'e.g. Epson projector, water dispenser',
  other: 'Describe the item',
}

/**
 * Serial numbers matter for electronics and vehicles; for a chair they are
 * noise. Furniture still shows the field when a value is already on record.
 */
export function showsSerial(category: AssetCategory, current: string) {
  return category !== 'furniture' || current.trim() !== ''
}

export function initialValues(asset: OfficeAsset | null, carry?: Pick<AssetFormValues, 'category' | 'location'>): AssetFormValues {
  const text = (v: unknown) => (v === null || v === undefined ? '' : String(v))
  return {
    name: text(asset?.name),
    category: asset?.category ?? carry?.category ?? 'furniture',
    condition: asset?.condition ?? 'good',
    location: text(asset?.location ?? carry?.location),
    brand: text(asset?.brand), model: text(asset?.model), serialNumber: text(asset?.serialNumber),
    registrationNumber: text(asset?.registrationNumber), insuranceUntil: text(asset?.insuranceUntil).slice(0, 10),
    supplier: text(asset?.supplier), invoiceNumber: text(asset?.invoiceNumber),
    purchaseDate: text(asset?.purchaseDate).slice(0, 10), purchaseCost: text(asset?.purchaseCost),
    warrantyUntil: text(asset?.warrantyUntil).slice(0, 10), serviceDue: text(asset?.serviceDue).slice(0, 10),
    documentUrl: text(asset?.documentUrl), photoUrl: text(asset?.photoUrl), notes: text(asset?.notes),
    reason: '',
  }
}

/** "78500", "78,500", "₹ 78,500.5" → 78500.5; anything else → NaN. */
export function parseRupees(raw: string): number {
  const cleaned = raw.replace(/[₹,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN
  return Number(cleaned)
}

/** Indian digit grouping: 985000 → "₹9,85,000". Paise only when present. */
export function formatRupees(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
}

export function displayDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** ISO date `years` after `from`, for the warranty shortcuts. 29 Feb lands on 28 Feb. */
export function addYears(from: string, years: number) {
  const [y, m, d] = from.split('-').map(Number)
  const target = new Date(y + years, m - 1, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d, last))
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
}

function isHttps(value: string) {
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

/**
 * The same rules the API enforces, checked before the request so each problem
 * is shown beside its field instead of as one server message at the top.
 */
export function validateAsset(v: AssetFormValues, mode: 'create' | 'edit'): AssetErrors {
  const e: AssetErrors = {}
  const today = localToday()
  if (!v.name.trim()) e.name = 'Give the asset a name staff will recognise.'
  else if (v.name.trim().length > 200) e.name = 'Keep the name under 200 characters.'
  if (!v.location.trim()) e.location = 'Say where the asset is kept, e.g. "Site office, Nishat".'
  if (v.purchaseCost.trim()) {
    const cost = parseRupees(v.purchaseCost)
    if (Number.isNaN(cost)) e.purchaseCost = 'Enter rupees only, e.g. 78500 or 78,500.50.'
    else if (cost > 999999999999.99) e.purchaseCost = 'That amount is too large.'
  }
  if (v.purchaseDate && v.purchaseDate > today) e.purchaseDate = 'The purchase date cannot be in the future.'
  if (v.warrantyUntil && v.purchaseDate && v.warrantyUntil < v.purchaseDate) e.warrantyUntil = 'Warranty cannot end before the purchase date.'
  for (const key of ['documentUrl', 'photoUrl'] as const) {
    if (v[key].trim() && !isHttps(v[key].trim())) e[key] = 'Paste a full link starting with https://'
  }
  if (mode === 'edit' && !v.reason.trim()) e.reason = 'Say why this record is being corrected. It is kept in the history.'
  return e
}

function shown(field: AssetField, raw: string): string {
  if (!raw) return '—'
  if (field === 'category') return CATEGORIES[raw as AssetCategory] ?? raw
  if (field === 'condition') return CONDITIONS[raw as OfficeAsset['condition']] ?? raw
  if (field === 'purchaseCost') { const n = parseRupees(raw); return Number.isNaN(n) ? raw : formatRupees(n) }
  if (/Date|Until|Due$/.test(field)) return displayDate(raw)
  return raw
}

/** What an edit changes, in words, for the confirmation shown above Save. */
export function describeChanges(before: AssetFormValues, edited: AssetFormValues) {
  // Mirror toPayload: vehicle-only fields are dropped from a non-vehicle record.
  const after = edited.category === 'vehicle' ? edited : { ...edited, registrationNumber: '', insuranceUntil: '' }
  const fields = (Object.keys(FIELD_LABELS) as AssetField[]).filter(f => f !== 'reason' && f !== 'location')
  return fields.flatMap(field => {
    const a = before[field].trim(), b = after[field].trim()
    const same = field === 'purchaseCost' ? (a === b || parseRupees(a) === parseRupees(b)) : a === b
    return same ? [] : [{ field, label: FIELD_LABELS[field], from: shown(field, a), to: shown(field, b) }]
  })
}

/** The request body. Empty optional fields are sent as null so a cleared value is cleared. */
export function toPayload(v: AssetFormValues, projectId: string, asset: OfficeAsset | null): AssetWrite {
  const optional = Object.fromEntries(OPTIONAL.map(key => [key, v[key].trim() || null])) as Partial<AssetWrite>
  const cost = v.purchaseCost.trim() ? parseRupees(v.purchaseCost) : null
  const vehicle = v.category === 'vehicle'
  return {
    ...optional,
    projectId,
    name: v.name.trim(),
    category: v.category,
    condition: v.condition,
    location: asset ? asset.location : v.location.trim(),
    purchaseCost: cost,
    // Vehicle-only fields are not carried onto a non-vehicle record.
    registrationNumber: vehicle ? optional.registrationNumber ?? null : null,
    insuranceUntil: vehicle ? optional.insuranceUntil ?? null : null,
    ...(asset ? { version: asset.version, reason: v.reason.trim() } : {}),
  }
}

/** Distinct locations already in use, so new entries reuse the same spelling. */
export function locationSuggestions(assets: Pick<OfficeAsset, 'location'>[]) {
  const seen = new Map<string, string>()
  for (const { location } of assets) {
    const key = location.trim().toLowerCase()
    if (key && !seen.has(key)) seen.set(key, location.trim())
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

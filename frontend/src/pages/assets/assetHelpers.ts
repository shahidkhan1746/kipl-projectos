import type { AssetAction, OfficeAsset } from '@/api/assets.api'

export function assetActions(asset: OfficeAsset, canDispose: boolean): AssetAction[] {
  const actions: Record<string, AssetAction[]> = {
    available: ['assign', 'transfer', 'verify', 'maintenance', 'repair', 'lost'],
    assigned: ['return', 'transfer', 'verify', 'maintenance', 'lost'],
    under_repair: ['repair_complete', 'verify', 'maintenance', 'lost'],
    lost: ['recover'], disposed: [],
  }
  const result = [...(actions[asset.status] ?? [])]
  if (canDispose && ['available', 'under_repair', 'lost'].includes(asset.status)) result.push('dispose')
  return result.filter(action => action !== 'assign' || asset.condition !== 'unserviceable')
}
export const ACTION_LABELS: Record<AssetAction, string> = { assign: 'Assign to employee', return: 'Return to office', transfer: 'Transfer location', repair: 'Send for repair', repair_complete: 'Complete repair', lost: 'Report lost', recover: 'Record recovery', dispose: 'Dispose asset', verify: 'Verify physically', maintenance: 'Record maintenance' }
export function localToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export function safeAssetLink(value?: string | null) { try { const u = new URL(value ?? ''); return u.protocol === 'https:' ? u.href : null } catch { return null } }
export function csvCell(value: unknown) {
  const text = String(value ?? '')
  return `"${(/^[\s]*[=+@\-\t\r]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`
}

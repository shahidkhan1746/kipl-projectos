import { describe, expect, it } from 'vitest'
import { assetActions, csvCell, safeAssetLink } from './assetHelpers'
import type { OfficeAsset } from '@/api/assets.api'

describe('asset UI safeguards', () => {
  it('keeps disposed assets read-only', () => {
    expect(assetActions({ status: 'disposed' } as OfficeAsset, true)).toEqual([])
  })
  it('does not offer disposal to non-managers', () => {
    expect(assetActions({ status: 'available' } as OfficeAsset, false)).not.toContain('dispose')
  })
  it('does not offer assignment for unserviceable equipment', () => {
    expect(assetActions({ status: 'available', condition: 'unserviceable' } as OfficeAsset, true)).not.toContain('assign')
  })
  it('accepts HTTPS references only', () => {
    expect(safeAssetLink('javascript:alert(1)')).toBeNull()
    expect(safeAssetLink('http://example.com')).toBeNull()
    expect(safeAssetLink('https://example.com')).toBe('https://example.com/')
  })
  it('escapes CSV quotes and neutralizes spreadsheet formulas', () => {
    expect(csvCell('a"b')).toBe('"a""b"')
    expect(csvCell('=1+1')).toBe('"\'=1+1"')
    expect(csvCell(null)).toBe('""')
  })
})

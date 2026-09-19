/**
 * One material catalogue for Site Diary, Material Register, and Procurement.
 *
 * Those three screens used to each ship their own list with different spellings
 * ("TMT Steel" vs "TMT SAIL BARS 16MM" vs "TMT Fe500D 16mm"). The register
 * balances by exact string, and diary receipts copy that string through
 * ops-sync — so two names for the same steel never meet.
 */

export type MaterialCategoryId =
  | 'cement_steel'
  | 'pipes_fittings'
  | 'aggregate_sand'
  | 'chemicals'
  | 'other'

export interface MaterialPreset {
  name: string
  unit: string
  spec?: string
}

export interface MaterialCategoryMeta {
  label: string
  shortLabel: string
  presets: MaterialPreset[]
}

export const MATERIAL_CATEGORIES: Record<MaterialCategoryId, MaterialCategoryMeta> = {
  cement_steel: {
    label: 'Cement & Steel (Clause 55)',
    shortLabel: 'Cement & Steel',
    presets: [
      { name: 'TMT SAIL BARS 8MM', unit: 'KG', spec: 'Fe500D TMT, IS 1786, seismic Zone V' },
      { name: 'TMT SAIL BARS 10MM', unit: 'KG', spec: 'Fe500D TMT, IS 1786' },
      { name: 'TMT SAIL BARS 12MM', unit: 'KG', spec: 'Fe500D TMT, IS 1786' },
      { name: 'TMT SAIL BARS 16MM', unit: 'KG', spec: 'Fe500D TMT, IS 1786, main reinforcement' },
      { name: 'TMT SAIL BARS 20MM', unit: 'KG', spec: 'Fe500D TMT, IS 1786' },
      { name: 'TMT SAIL BARS 25MM', unit: 'KG', spec: 'Fe500D TMT, IS 1786' },
      { name: 'TMT SAIL BARS 32MM', unit: 'KG', spec: 'Fe500D TMT, IS 1786, raft / column' },
      { name: 'TMT Steel Fe500D (Jindal/SAIL)', unit: 'MT', spec: 'High ductile TMT, IS 1786' },
      { name: 'Structural Steel (Angles/Channels IS 2062)', unit: 'MT' },
      { name: 'Binding Wire (18 Gauge)', unit: 'KG', spec: 'Annealed galvanized binding wire' },
      { name: 'OPC Cement 43 Grade (IS 269)', unit: 'Bags', spec: '50 kg bags, IS 8112 / IS 269' },
      { name: 'OPC Cement 53 Grade (IS 269)', unit: 'Bags', spec: '50 kg bags, IS 12269 / IS 269' },
      { name: 'PPC Cement (IS 1489)', unit: 'Bags', spec: 'Fly-ash blended, 50 kg bags' },
      { name: 'Concrete Cover Blocks 40mm/50mm', unit: 'Nos' },
    ],
  },
  pipes_fittings: {
    label: 'Pipes & Fittings',
    shortLabel: 'Pipes & Fittings',
    presets: [
      { name: 'DI K9 Pipe 150mm dia (IS 8329)', unit: 'Rmt' },
      { name: 'DI K9 Pipe 200mm dia (IS 8329)', unit: 'Rmt' },
      { name: 'DI K9 Pipe 250mm dia (IS 8329)', unit: 'Rmt' },
      { name: 'DI K9 Pipe 300mm dia (IS 8329)', unit: 'Rmt' },
      { name: 'DI K9 Pipe 400mm dia (IS 8329)', unit: 'Rmt' },
      { name: 'HDPE Pipe 110mm OD PN6 PE100', unit: 'Rmt' },
      { name: 'HDPE Pipe 160mm OD PN6 PE100', unit: 'Rmt' },
      { name: 'HDPE Pipe 200mm OD PN10 PE100', unit: 'Rmt' },
      { name: 'RCC NP3 Pipe 200mm dia (IS 458)', unit: 'Rmt' },
      { name: 'RCC NP3 Pipe 300mm dia (IS 458)', unit: 'Rmt' },
      { name: 'RCC NP3 Pipe 450mm dia (IS 458)', unit: 'Rmt' },
      { name: 'RCC NP3 Pipe 600mm dia (IS 458)', unit: 'Rmt' },
      { name: 'Sluice Valve 150mm PN 1.0 (IS 14846)', unit: 'Nos' },
      { name: 'Sluice Valve 200mm PN 1.0 (IS 14846)', unit: 'Nos' },
      { name: 'Non-Return (Check) Valve 150mm', unit: 'Nos' },
      { name: 'Non-Return (Check) Valve 200mm', unit: 'Nos' },
      { name: 'Air Release Valve 50mm Double Orifice', unit: 'Nos' },
      { name: 'DI Dismantling Joint 150mm', unit: 'Nos' },
    ],
  },
  aggregate_sand: {
    label: 'Aggregates & Sand',
    shortLabel: 'Aggregates & Sand',
    presets: [
      { name: 'Coarse Aggregate 10mm Graded (IS 383)', unit: 'Cu.m' },
      { name: 'Coarse Aggregate 20mm Graded (IS 383)', unit: 'Cu.m' },
      { name: 'Coarse Aggregate 40mm Graded', unit: 'Cu.m' },
      { name: 'Coarse Aggregate 63mm Graded', unit: 'Cu.m' },
      { name: 'Coarse Aggregate 70–80mm Oversized', unit: 'Cu.m' },
      { name: 'Fine River Sand (Zone II IS 383)', unit: 'Cu.m' },
      { name: 'Coarse Sand', unit: 'Cu.m' },
      { name: 'Khak Bajri', unit: 'Cu.m' },
      { name: 'Stone Dust / Crushed Sand', unit: 'Cu.m' },
      { name: 'Granular Sub-Base (GSB) Material', unit: 'Cu.m' },
      { name: 'Wet Mix Macadam (WMM)', unit: 'Cu.m' },
      { name: 'Soling Stone / Boulders', unit: 'Cu.m' },
    ],
  },
  chemicals: {
    label: 'Chemicals & Admixtures',
    shortLabel: 'Chemicals & Admixtures',
    presets: [
      { name: 'Integral Liquid Waterproofing Compound', unit: 'Litres' },
      { name: 'Superplasticizer & Retarder (IS 9103)', unit: 'Litres' },
      { name: 'Aluminised Curing Compound', unit: 'Litres' },
      { name: 'Non-Shrink Micro-Concrete / Grout', unit: 'Bags' },
      { name: 'Polysulphide Joint Sealant', unit: 'KG' },
      { name: 'Bitumen', unit: 'KG' },
    ],
  },
  other: {
    label: 'Other Materials',
    shortLabel: 'Other Materials',
    presets: [
      { name: 'Clay Bricks Class 75 (IS 1077)', unit: 'Nos' },
      { name: 'Concrete Blocks', unit: 'Nos' },
      { name: 'Precast RCC Manhole Cover & Frame (Heavy Duty)', unit: 'Sets' },
      { name: 'Non-Woven Geotextile Fabric (200 GSM)', unit: 'Sqm' },
      { name: 'PVC Waterstop 150mm', unit: 'Rmt' },
      { name: 'PVC Perforated Pipe 100mm Drainage', unit: 'Rmt' },
      { name: 'HSD / Diesel', unit: 'Litre' },
      { name: 'Water', unit: 'Litre' },
    ],
  },
}

export const MATERIAL_UNITS = [
  'Cu.m', 'Brass', 'MT', 'KG', 'Bags', 'Nos', 'Sets', 'Sqm', 'Rmt', 'Litre', 'Litres', 'Trip',
]

export const MATERIAL_CATEGORY_IDS = Object.keys(MATERIAL_CATEGORIES) as MaterialCategoryId[]

export function allMaterialPresets(): MaterialPreset[] {
  return MATERIAL_CATEGORY_IDS.flatMap(id => MATERIAL_CATEGORIES[id].presets)
}

export function allMaterialNames(): string[] {
  return allMaterialPresets().map(p => p.name)
}

export function presetForName(name: string): MaterialPreset | undefined {
  const n = (name || '').trim().toLowerCase()
  if (!n) return undefined
  return allMaterialPresets().find(p => p.name.toLowerCase() === n)
}

export function categoryMeta(id: string): MaterialCategoryMeta {
  return MATERIAL_CATEGORIES[(id as MaterialCategoryId)] ?? MATERIAL_CATEGORIES.other
}

export function getMaterialCategory(matName: string): MaterialCategoryId {
  const exact = presetForName(matName)
  if (exact) {
    for (const id of MATERIAL_CATEGORY_IDS) {
      if (MATERIAL_CATEGORIES[id].presets.some(p => p.name === exact.name)) return id
    }
  }
  const m = (matName || '').toLowerCase()
  if (
    m.includes('cement') || m.includes('opc') || m.includes('ppc') ||
    m.includes('steel') || m.includes('tmt') || m.includes('rebar') ||
    m.includes('sail') || m.includes('jindal') || m.includes('fe500') ||
    m.includes('structural') || m.includes('binding wire')
  ) return 'cement_steel'
  if (
    m.includes('pipe') || m.includes('fitting') || m.includes('di k') ||
    m.includes('hdpe') || m.includes('rcc np') || m.includes('valve') ||
    m.includes('bend') || m.includes('collar') || m.includes('flange') ||
    m.includes('dismantling')
  ) return 'pipes_fittings'
  if (
    m.includes('aggregate') || m.includes('sand') || m.includes('gravel') ||
    m.includes('stone') || m.includes('bajri') || m.includes('dust') ||
    m.includes('grit') || m.includes('gsb') || m.includes('wmm') ||
    m.includes('soling') || m.includes('boulder')
  ) return 'aggregate_sand'
  if (
    m.includes('admixture') || m.includes('chemical') || m.includes('curing') ||
    m.includes('waterproof') || m.includes('compound') || m.includes('grout') ||
    m.includes('sealant') || m.includes('epoxy') || m.includes('bitumen')
  ) return 'chemicals'
  return 'other'
}

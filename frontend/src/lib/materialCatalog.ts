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
  aliases?: string[]
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
      {
        name: 'Coarse Aggregate 63mm Graded',
        unit: 'Cu.m',
        spec: '63mm single graded coarse aggregate (IS 383)',
        aliases: [
          '63mm graded',
          '63 mm graded',
          '63mm aggregate',
          '63 mm aggregate',
          '63mm',
          '63 mm',
          'coarse aggregate 63mm',
        ],
      },
      {
        name: '63mm Downgrade',
        unit: 'Cu.m',
        spec: '63mm down graded aggregate for sub-base / WBM / soling',
        aliases: [
          '63 mm downgrade',
          '63mm downgrade aggregate',
          'coarse aggregate 63mm downgrade',
          '63 mm downgrade aggregate',
          '63mm d/g',
          'downgrade 63mm',
        ],
      },
      { name: 'Coarse Aggregate 70–80mm Oversized', unit: 'Cu.m' },
      { name: 'Fine River Sand (Zone II IS 383)', unit: 'Cu.m' },
      { name: 'Coarse Sand', unit: 'Cu.m' },
      {
        name: 'Khak Bajri',
        unit: 'Cu.m',
        spec: 'Crusher dust / fine stone dust for leveling, bedding and masonry',
        aliases: [
          'khak bajri',
          'khakh bajari',
          'khakh bajri',
          'khakh-bajari',
          'khaka bajri',
          'khakha bajri',
          'khak-bajri',
          'khakbajri',
          'crusher dust',
        ],
      },
      {
        name: 'Stone Dust / Crushed Sand',
        unit: 'Cu.m',
        spec: 'Stone dust / screen dust / crushed sand for pipe bedding and masonry',
        aliases: [
          'dust screen',
          'stone dust',
          'screen dust',
          'crushed sand',
          'stone dust / crushed sand',
        ],
      },
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
  'Cu.m', 'cft', 'CFT', 'Brass', 'MT', 'KG', 'Bags', 'Nos', 'Sets', 'Sqm', 'Rmt', 'Litre', 'Litres', 'Trip',
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
  const presets = allMaterialPresets()
  // 1. Exact match on preset name
  const exact = presets.find(p => p.name.toLowerCase() === n)
  if (exact) return exact
  // 2. Exact match on alias
  const aliasMatch = presets.find(p => p.aliases?.some(a => a.toLowerCase() === n))
  if (aliasMatch) return aliasMatch
  // 3. Space- and hyphen-collapsed match (e.g. '63 mm downgrade' vs '63mm downgrade')
  const clean = n.replace(/[\s\-_/.]+/g, '')
  if (!clean) return undefined
  return presets.find(p => {
    if (p.name.toLowerCase().replace(/[\s\-_/.]+/g, '') === clean) return true
    return p.aliases?.some(a => a.toLowerCase().replace(/[\s\-_/.]+/g, '') === clean)
  })
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
    m.includes('soling') || m.includes('boulder') || m.includes('downgrade') ||
    m.includes('khak')
  ) return 'aggregate_sand'
  if (
    m.includes('admixture') || m.includes('chemical') || m.includes('curing') ||
    m.includes('waterproof') || m.includes('compound') || m.includes('grout') ||
    m.includes('sealant') || m.includes('epoxy') || m.includes('bitumen')
  ) return 'chemicals'
  return 'other'
}

import { useQuery } from '@tanstack/react-query'
import { masterDataApi } from '@/api/masterData.api'

export function useMasterDropdowns() {
  const { data: grouped, isLoading } = useQuery({
    queryKey: ['master-dropdowns-grouped'],
    queryFn: () => masterDataApi.getGrouped(true).then((r: any) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  // Dynamic materials: start with local presets, merge DB items
  const dbMaterials = (grouped?.material || []).map((m: any) => ({
    name: m.value,
    unit: m.unit || 'Nos',
    category: (m.category as MaterialCategoryId) || 'other',
    spec: m.spec,
    aliases: (m.metadata?.aliases as string[]) || [],
  }))

  const matMap = new Map<string, MaterialPreset & { category: MaterialCategoryId }>()
  for (const catId of MATERIAL_CATEGORY_IDS) {
    for (const p of MATERIAL_CATEGORIES[catId].presets) {
      matMap.set(p.name.toLowerCase(), { ...p, category: catId })
    }
  }
  for (const m of dbMaterials) {
    matMap.set(m.name.toLowerCase(), m)
  }

  const allPresets = Array.from(matMap.values())
  const allNames = allPresets.map(p => p.name)

  const presetsByCategory = (cat: string) => {
    return allPresets.filter(p => p.category === cat)
  }

  const findPreset = (name: string): MaterialPreset | undefined => {
    const n = (name || '').trim().toLowerCase()
    if (!n) return undefined
    const exact = allPresets.find(p => p.name.toLowerCase() === n)
    if (exact) return exact
    const aliasMatch = allPresets.find(p => p.aliases?.some(a => a.toLowerCase() === n))
    if (aliasMatch) return aliasMatch
    const clean = n.replace(/[\s\-_/.]+/g, '')
    if (!clean) return undefined
    return allPresets.find(p => {
      if (p.name.toLowerCase().replace(/[\s\-_/.]+/g, '') === clean) return true
      return p.aliases?.some(a => a.toLowerCase().replace(/[\s\-_/.]+/g, '') === clean)
    })
  }

  // Dynamic units
  const dbUnits = (grouped?.unit || []).map((u: any) => u.value)
  const units = dbUnits.length > 0 ? Array.from(new Set([...dbUnits, ...MATERIAL_UNITS])) : MATERIAL_UNITS

  // Dynamic equipment types
  const dbEquip = (grouped?.equipment_type || []).map((e: any) => e.value)
  const defaultEquip = [
    'Excavator','Tipper/Dumper','Concrete Mixer','Vibrator',
    'Water Tanker','Compactor','Crane','Generator','Pump',
    'JCB / Backhoe','Transit Mixer','Pipe Laying Machine','Other',
  ]
  const equipmentTypes = dbEquip.length > 0 ? Array.from(new Set([...dbEquip, ...defaultEquip])) : defaultEquip

  // Dynamic site zones
  const dbZones = (grouped?.site_zone || []).map((z: any) => z.value)
  const defaultZones = [
    'IPS-1 (Node 102)','IPS-2 (Node 702)','IPS-3 (Node 1053)',
    'IPS-4 (Node 1266)','IPS-5 (Node 1532)','IPS-6 (Node 1763)',
    'IPS-7 (Node 2670)','IPS-8 (Node 3561)','IPS-9 (Node 4011)',
    'MPS (Habak)','STP Site','30 MLD STP Ishbar Nishat','Shalimar Site','Rising Main','General Site',
  ]
  const siteZones = dbZones.length > 0 ? Array.from(new Set([...dbZones, ...defaultZones])) : defaultZones

  // Dynamic stakeholders
  const dbStakeholders = (grouped?.stakeholder || []).map((s: any) => s.value)
  const defaultStakeholders = [
    'UEED','LCMA','NIT Srinagar','AMRUT','Forest Department','SMC','DC Office',
    'PWD','Traffic Police','IRMA','Keller Ground Engineering Pvt Ltd','Wani Infrastructure Pvt Ltd',
    'Alamdar Stone Crusher','Consultant','J&K Bank','KIPL',
  ]
  const stakeholders = dbStakeholders.length > 0 ? Array.from(new Set([...dbStakeholders, ...defaultStakeholders])) : defaultStakeholders

  return {
    isLoading,
    allPresets,
    allNames,
    presetsByCategory,
    findPreset,
    units,
    equipmentTypes,
    siteZones,
    stakeholders,
  }
}

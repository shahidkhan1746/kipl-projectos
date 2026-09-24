/**
 * The wire contract for the concrete cube register.
 *
 * The form and the API were built against different field names — every one of
 * them, in both directions. The form sent {sampleNo, structure, location,
 * loadsKn} and the server wanted {sampleCode, structureElement, pourLocation,
 * loads7dKn}; the table read {status, dueDate7d, actual7dStrengthMpa} and the
 * server sent {stage, test7dDate, avgStrength7dMpa}. Nothing matched, so the
 * tab could not render a row and the form could not save one.
 *
 * Keeping the mapping here, rather than inline in the JSX, is what lets it be
 * tested — which is the part that was missing.
 */

/** Crushing area of the standard 150 x 150 mm cube, in mm². */
export const CUBE_AREA_MM2 = 22500

export type CubeStage = 'CAST' | '7D_DUE' | '7D_TESTED' | '28D_DUE' | 'PASSED' | 'FAILED'

/** A row as GET /qa/cube-tests sends it. */
export interface CubeRow {
  id: string
  sampleCode?: string
  pourLocation?: string
  structureElement?: string
  grade: string
  cementType?: string
  castDate: string
  fckRequiredMpa: number | string
  /** Due dates: cast + 7 and cast + 28. */
  test7dDate?: string | null
  test28dDate?: string | null
  /** When the cube was actually crushed. */
  break7dDate?: string | null
  break28dDate?: string | null
  load7d1Kn?: number | string | null
  load7d2Kn?: number | string | null
  load7d3Kn?: number | string | null
  load28d1Kn?: number | string | null
  load28d2Kn?: number | string | null
  load28d3Kn?: number | string | null
  avgStrength7dMpa?: number | string | null
  avgStrength28dMpa?: number | string | null
  predicted28dMpa?: number | string | null
  cementBrand?: string | null
  waterCementRatio?: number | string | null
  slumpMm?: number | string | null
  /** Derived server-side by cubeStage(); see backend/src/qa/cube-status.ts. */
  stage: CubeStage
  atRisk: boolean
}

export interface CubeForm {
  castDate: string
  structure: string
  location: string
  grade: string
  mixType: string
  cementBrand: string
  cementType: string
  waterCementRatio: string
  slumpMm: string
  curingCondition: string
  cubeCount: number | string
  sampleNo: string
  supplierBatch: string
  castBy: string
}

export interface BreakForm {
  loadsKn: string[]
  breakDate: string
  technician: string
  notes: string
}

/** The form's curing options, in the words the entity stores. */
const CURING_METHODS: Record<string, string> = {
  lab_tank: 'Water Curing',
  site_cured: 'Site Curing',
  steam: 'Steam Curing',
  membrane: 'Membrane Curing',
}

/** A decimal column arrives as a string over JSON; null must stay null. */
export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Optional numeric form field: blank means "not recorded", not zero. */
function optionalNum(value: unknown): number | undefined {
  const n = num(value)
  return n === null ? undefined : n
}

/**
 * Build the create payload.
 *
 * fckRequiredMpa is deliberately not sent: the server derives it from the grade
 * via CONCRETE_GRADE_CONFIGS, and a client-supplied target strength is how a
 * cube ends up judged against the wrong fck.
 */
export function cubeCreatePayload(form: CubeForm, projectId: string) {
  return {
    projectId,
    sampleCode: form.sampleNo.trim(),
    pourLocation: form.location.trim(),
    structureElement: form.structure.trim(),
    grade: form.grade,
    cementType: form.cementType,
    castDate: form.castDate,
    batchOrMixId: form.supplierBatch.trim() || undefined,
    curingMethod: CURING_METHODS[form.curingCondition] ?? form.curingCondition,
    cementBrand: form.cementBrand.trim() || undefined,
    waterCementRatio: optionalNum(form.waterCementRatio),
    slumpMm: optionalNum(form.slumpMm),
    cubeCount: optionalNum(form.cubeCount) ?? 6,
    mixType: form.mixType,
    technicianName: form.castBy.trim() || undefined,
  }
}

/**
 * The crushing loads the operator actually entered, in kN.
 *
 * Exported so the caller can check the count (IS 456 cl. 15.2 wants three)
 * without reaching into the payload, whose loads key differs by age.
 */
export function cubeBreakLoads(form: BreakForm): number[] {
  return form.loadsKn.map(num).filter((n): n is number => n !== null && n > 0)
}

/** Build the 7-day or 28-day break payload. The loads key differs by age. */
export function cubeBreakPayload(age: '7d' | '28d', form: BreakForm) {
  const loads = cubeBreakLoads(form)
  const common = {
    breakDate: form.breakDate,
    technicianName: form.technician.trim() || undefined,
    remarks: form.notes.trim() || undefined,
  }
  return age === '7d'
    ? { ...common, loads7dKn: loads }
    : { ...common, loads28dKn: loads }
}

/** The three load columns as one list, dropping the ones never entered. */
export function cubeLoads(row: CubeRow, age: '7d' | '28d'): number[] {
  const raw = age === '7d'
    ? [row.load7d1Kn, row.load7d2Kn, row.load7d3Kn]
    : [row.load28d1Kn, row.load28d2Kn, row.load28d3Kn]
  return raw.map(num).filter((n): n is number => n !== null)
}

/** Strength in MPa from a crushing load in kN, on the 150 mm cube. */
export function strengthMpa(loadKn: number): number {
  return +((loadKn * 1000) / CUBE_AREA_MM2).toFixed(2)
}

/**
 * IS 456 Annex B: a specimen more than 15% from the set average is an outlier
 * and the set should not be accepted on it. Only checked on a full set of
 * three, and never against a zero mean.
 */
export function hasOutlier(strengths: number[]): boolean {
  if (strengths.length < 3) return false
  const mean = strengths.reduce((a, b) => a + b, 0) / strengths.length
  if (mean <= 0) return false
  return strengths.some(s => Math.abs(s - mean) / mean > 0.15)
}

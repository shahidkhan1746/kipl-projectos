/**
 * How a material is identified for stock purposes, and why it needs saying.
 *
 * The register keys its running balance on the material string exactly as
 * stored. `validate()` trimmed the name to check it was non-empty and then
 * saved the untrimmed value, and nothing normalised case — so three deliveries
 * of one material entered as "Khak Bajri", "Khak Bajri " and "khak bajri"
 * became three separate stock lines with three independent balances. The
 * catalogue that resolves aliases lives in the frontend, so the GRN write path
 * on the server never saw it at all.
 */

/** The stored form of a material name: trimmed, inner whitespace collapsed. */
export function canonicalMaterialName(raw: unknown): string {
  return String(raw ?? '').trim().replace(/\s+/g, ' ')
}

/**
 * The key two rows must share to be the same stock line.
 *
 * Case-insensitive, because "Khak Bajri" and "khak bajri" are one material to
 * everyone except a string comparison. The display name stays as entered; only
 * the grouping is folded.
 */
export function materialKey(raw: unknown): string {
  return canonicalMaterialName(raw).toLowerCase()
}

/**
 * Stock is per project. The balance was keyed on the material name alone, so a
 * call that omitted projectId — which the controller permits, and which an
 * admin bypassing project scoping reaches — summed one project's cement into
 * another's and returned a single figure belonging to neither.
 */
export function stockKey(projectId: unknown, material: unknown): string {
  return `${String(projectId ?? '')}::${materialKey(material)}`
}

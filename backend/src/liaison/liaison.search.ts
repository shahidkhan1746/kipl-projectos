/** One token of a search box, in the two forms the query needs. */
export interface SearchTerm {
  /** Lower-cased, for a plain LIKE against text columns. */
  like: string
  /** Letters and digits only, for matching a reference typed without its
   *  separators — "kipl20260001" against "KIPL/2026/LIA/0001". Empty when the
   *  token was punctuation alone. */
  normalised: string
}

/**
 * Splits what someone typed into terms to match.
 *
 * Three things a single `includes()` got wrong, all of them ordinary ways to
 * search for a file:
 *
 *   "load test interim"   Words in a different order to the subject. Each term
 *                         is matched separately and ANDed, so word order and
 *                         adjacency stop mattering.
 *   "kipl 2026 0001"      A reference typed without its slashes. Both the
 *                         column and the term are stripped to alphanumerics
 *                         for a second comparison.
 *   "  ueed  "            Stray whitespace, which made an exact-substring
 *                         match fail against a field that was otherwise right.
 *
 * Capped at eight terms: each one adds a bracketed OR across ten columns, and
 * nobody types nine words into a file search on purpose.
 */
export function searchTerms(raw: string | undefined | null): SearchTerm[] {
  if (!raw) return []
  return raw
    // No trim: filter(Boolean) below already drops the empty strings that
    // leading and trailing whitespace produces, so trimming first changed
    // nothing and read as though it did.
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map(token => ({
      like: token,
      normalised: token.replace(/[^a-z0-9]/g, ''),
    }))
}

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

/** A column the register is searched across. */
export interface SearchColumn {
  /** Query-builder path, e.g. 'f.subject'. */
  path: string
  /**
   * Whether the underlying column is a Postgres enum.
   *
   * This is not a detail. Postgres has no `lower(enum)` and will not coerce one
   * to text to find an overload — it raises
   * `function lower(liaison_files_file_type_enum) does not exist` and fails the
   * entire statement. Three of the columns below are enums, so an uncast
   * LOWER() over this list did not degrade or return nothing: it made every
   * single search a 500, while the page kept showing the previous results and
   * looked simply unresponsive.
   */
  isEnum?: boolean
}

/**
 * Where a term is looked for. Each is ORed within a term; terms are ANDed, so
 * "ueed load test" finds a UEED file about a load test.
 */
export const FILE_SEARCH_COLUMNS: SearchColumn[] = [
  { path: 'f.subject' },
  { path: 'f.fileNumber' },
  { path: 'f.departmentRef' },
  { path: 'f.department' },
  { path: 'f.remarks' },
  { path: 'f.eotReason' },
  { path: 'f.linkedWbsCode' },
  { path: 'f.fileType', isEnum: true },
  { path: 'f.priority', isEnum: true },
  { path: 'f.currentStatus', isEnum: true },
  // Who raised it and who is sitting on it. On a liaison desk "what is with
  // Bashir" is as common a question as any reference number.
  { path: 'initiatedBy.name' },
  { path: 'currentHolder.name' },
]

/** The reference columns, matched again with their separators removed. */
export const FILE_REFERENCE_COLUMNS = ['f.fileNumber', 'f.departmentRef'] as const

/** The column as lower-cased text, safe to LIKE against whatever its type is. */
export function loweredText(column: SearchColumn): string {
  return column.isEnum ? `LOWER(CAST(${column.path} AS TEXT))` : `LOWER(${column.path})`
}

/** The column reduced to letters and digits, for a reference typed without its
 *  separators — "kipl20260001" against "KIPL/2026/LIA/0001". */
export function strippedText(path: string): string {
  return `regexp_replace(LOWER(${path}), '[^a-z0-9]', '', 'g')`
}

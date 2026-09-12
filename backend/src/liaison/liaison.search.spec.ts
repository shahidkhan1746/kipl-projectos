import { searchTerms } from './liaison.search'

/**
 * What someone typing into the liaison search box should be able to get away
 * with. Each case here was a way the old single `includes()` returned nothing
 * for a file that was plainly there.
 */
describe('searchTerms', () => {
  it('is empty for nothing typed', () => {
    expect(searchTerms('')).toEqual([])
    expect(searchTerms('   ')).toEqual([])
    expect(searchTerms(undefined)).toEqual([])
    expect(searchTerms(null)).toEqual([])
  })

  it('ignores stray whitespace around and between words', () => {
    expect(searchTerms('  ueed   load  ').map(t => t.like)).toEqual(['ueed', 'load'])
  })

  it('lower-cases, so typing matches regardless of case', () => {
    expect(searchTerms('UEED').map(t => t.like)).toEqual(['ueed'])
  })

  // Each term is ANDed and matched independently, so the subject
  // "Interim report of Load Test" is found by "load test interim".
  it('splits a phrase into separate terms', () => {
    expect(searchTerms('load test interim').map(t => t.like))
      .toEqual(['load', 'test', 'interim'])
  })

  // A reference is written KIPL/2026/LIA/0001 and typed a dozen other ways.
  it('strips separators so a reference can be typed without them', () => {
    expect(searchTerms('KIPL/2026/LIA/0001')[0])
      .toEqual({ like: 'kipl/2026/lia/0001', normalised: 'kipl2026lia0001' })
    expect(searchTerms('kipl-2026')[0].normalised).toBe('kipl2026')
  })

  // The stripped form of "/" is "", and "%%" matches every row in the table.
  it('leaves the stripped form empty for a punctuation-only term', () => {
    expect(searchTerms('///')[0]).toEqual({ like: '///', normalised: '' })
    expect(searchTerms('-')[0].normalised).toBe('')
  })

  it('caps the number of terms, so one paste cannot build a huge query', () => {
    const typed = 'a b c d e f g h i j k l'
    expect(searchTerms(typed)).toHaveLength(8)
  })

  it('keeps digits and letters together in a single token', () => {
    expect(searchTerms('LIA0001')[0]).toEqual({ like: 'lia0001', normalised: 'lia0001' })
  })
})

import { readFileSync } from 'fs'
import { join } from 'path'
import {
  FILE_SEARCH_COLUMNS, FILE_REFERENCE_COLUMNS, loweredText, strippedText,
} from './liaison.search'

/**
 * The bug this guards: `LOWER(f.fileType)` on a Postgres enum column.
 *
 * Postgres does not coerce an enum to text to find a `lower` overload. It
 * raises `function lower(..._enum) does not exist` and fails the whole
 * statement, so every search was a 500 — and because the page keeps the
 * previous results while a query is in flight, it looked like the box simply
 * did nothing.
 */
describe('reading a searched column as text', () => {
  const pathsOf = (cols: typeof FILE_SEARCH_COLUMNS) => cols.map(c => c.path)

  it('casts an enum column before lowering it', () => {
    expect(loweredText({ path: 'f.fileType', isEnum: true }))
      .toBe('LOWER(CAST(f.fileType AS TEXT))')
  })

  it('leaves a text column alone', () => {
    expect(loweredText({ path: 'f.subject' })).toBe('LOWER(f.subject)')
  })

  it('never calls LOWER directly on an enum column', () => {
    for (const column of FILE_SEARCH_COLUMNS) {
      if (!column.isEnum) continue
      expect(loweredText(column)).not.toBe(`LOWER(${column.path})`)
      expect(loweredText(column)).toContain('AS TEXT')
    }
  })

  it('strips separators off a reference column', () => {
    expect(strippedText('f.fileNumber'))
      .toBe("regexp_replace(LOWER(f.fileNumber), '[^a-z0-9]', '', 'g')")
  })

  it('searches both reference columns without separators', () => {
    expect([...FILE_REFERENCE_COLUMNS]).toEqual(['f.fileNumber', 'f.departmentRef'])
  })

  it('searches the columns a liaison desk actually asks about', () => {
    const paths = pathsOf(FILE_SEARCH_COLUMNS)
    for (const expected of [
      'f.subject', 'f.fileNumber', 'f.departmentRef', 'f.department',
      'f.remarks', 'f.eotReason', 'f.linkedWbsCode',
      'f.fileType', 'f.priority', 'f.currentStatus',
      'initiatedBy.name', 'currentHolder.name',
    ]) {
      expect(paths).toContain(expected)
    }
  })

  it('names every column only once', () => {
    const paths = pathsOf(FILE_SEARCH_COLUMNS)
    expect(new Set(paths).size).toBe(paths.length)
  })

  /**
   * Read straight off the entity, so adding a fourth enum column and dropping
   * it into the search list unmarked fails here rather than in production.
   */
  it('marks exactly the columns the entity declares as enums', () => {
    const source = readFileSync(join(__dirname, 'liaison-file.entity.ts'), 'utf8')
    const enumProperties = new Set<string>()
    const declaration = /@Column\(\{[^}]*type:\s*'enum'[^}]*\}\)\s*\n\s*(\w+)\s*[!?]?:/g
    for (const match of source.matchAll(declaration)) enumProperties.add(match[1])

    // The parse itself has to be working for the assertion below to mean
    // anything: the entity has three enum columns today.
    expect(enumProperties.size).toBeGreaterThan(0)

    for (const column of FILE_SEARCH_COLUMNS) {
      if (!column.path.startsWith('f.')) continue
      const property = column.path.slice(2)
      if (!enumProperties.has(property)) continue
      expect(column.isEnum).toBe(true)
    }

    const markedButNotEnum = FILE_SEARCH_COLUMNS
      .filter(c => c.isEnum && !enumProperties.has(c.path.slice(2)))
      .map(c => c.path)
    expect(markedButNotEnum).toEqual([])
  })
})

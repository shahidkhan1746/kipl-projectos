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

import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TravelPartnerLink } from './TravelPartnerLink'

describe('travel partner link', () => {
  const html = renderToStaticMarkup(<TravelPartnerLink />)

  it('points at the partner by name', () => {
    expect(html).toContain('href="https://falcontrails.in/"')
    expect(html).toContain('>Falcon Trails</a>')
  })

  it('stays a followed link that keeps the referrer', () => {
    expect(html).toContain('rel="noopener"')
    expect(html).not.toMatch(/nofollow|noreferrer|sponsored|ugc/)
  })
})

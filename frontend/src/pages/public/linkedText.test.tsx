import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseLinks, plainText } from './linkedText'
import { LinkedText } from './LinkedText'

const update = 'Engineers from the piling subcontractor visited the basin block. Travel and stays were arranged by [Falcon Trails](https://falcontrails.in/corporate).'

describe('links in timeline updates', () => {
  it('turns [text](https://…) into a link and keeps the sentence around it', () => {
    expect(parseLinks(update)).toEqual([
      { kind: 'text', text: 'Engineers from the piling subcontractor visited the basin block. Travel and stays were arranged by ' },
      { kind: 'link', text: 'Falcon Trails', href: 'https://falcontrails.in/corporate' },
      { kind: 'text', text: '.' },
    ])
    expect(plainText(update)).toBe('Engineers from the piling subcontractor visited the basin block. Travel and stays were arranged by Falcon Trails.')
  })

  it('leaves anything that is not an https link as typed', () => {
    for (const raw of ['[x](http://a.com)', '[x](javascript:alert(1))', '[x](www.a.com)', '[x] (https://a.com)', 'no links']) {
      expect(parseLinks(raw)).toEqual([{ kind: 'text', text: raw }])
    }
  })

  it('renders followed links and escapes everything else', () => {
    const html = renderToStaticMarkup(<LinkedText text={'<b>bold?</b> see [guide](https://falcontrails.in/kashmir/distances)'} />)
    expect(html).toContain('&lt;b&gt;bold?&lt;/b&gt;')
    expect(html).toContain('<a href="https://falcontrails.in/kashmir/distances" target="_blank" rel="noopener">guide</a>')
  })
})

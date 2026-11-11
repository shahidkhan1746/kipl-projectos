import type { CSSProperties, ReactNode } from 'react'

const PARTNER = { name: 'Falcon Trails', origin: 'https://falcontrails.in' }

/**
 * A link to the Srinagar travel company that arranges visits to the project.
 *
 * Every mention of the partner goes through here so they all behave the same:
 * a plain followed link that keeps the referrer. No `nofollow`, so search
 * engines credit the mention, and no `noreferrer`, so the partner can see that
 * visitors came from this site.
 *
 * Use it only where the partner's page is the natural next read for the
 * sentence it sits in, never as a free-standing advertisement. `path` picks
 * the page on the partner's site; the link text defaults to the partner's name.
 */
export function TravelPartnerLink({ path, children, className, style }: {
  path: `/${string}`
  children?: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <a className={className} style={style} href={PARTNER.origin + path} target="_blank" rel="noopener">
      {children ?? PARTNER.name}
    </a>
  )
}

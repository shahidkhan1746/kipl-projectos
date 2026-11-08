import type { CSSProperties } from 'react'

const PARTNER = { name: 'Falcon Trails', url: 'https://falcontrails.in/' }

/**
 * The Srinagar travel company that arranges visits to the project.
 *
 * A plain followed link that keeps the referrer: no `nofollow`, so search
 * engines credit the mention, and no `noreferrer`, so the partner can see that
 * visitors came from this site. Change the target here and every mention follows.
 */
export function TravelPartnerLink({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <a className={className} style={style} href={PARTNER.url} target="_blank" rel="noopener">
      {PARTNER.name}
    </a>
  )
}

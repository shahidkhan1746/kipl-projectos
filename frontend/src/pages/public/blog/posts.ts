import type { ComponentType } from 'react'
import IndustrialVisits from './posts/IndustrialVisits'
import VisitingEngineers from './posts/VisitingEngineers'
import SewerNetwork from './posts/SewerNetwork'

export interface BlogPost {
  slug: string
  /** Page title and headline. Kept under 65 characters so search results show it whole. */
  title: string
  /** Meta description and the summary on the blog index. Under 160 characters. */
  description: string
  /** ISO dates. */
  published: string
  updated?: string
  /** Who the post is for, shown above the headline. */
  audience: string
  Body: ComponentType
}

export const SITE_ORIGIN = 'https://kiplstpsrinagar.com'
export const BLOG_PATH = '/site/blog'
export const BLOG_AUTHOR = 'KIPL project team'

/** Newest first. */
export const POSTS: BlogPost[] = [
  {
    slug: 'industrial-visits-nishat-stp',
    title: 'Industrial visits to the Nishat sewage treatment plant',
    description: 'What civil and environmental engineering students can see at the Dal Lake sewerage project in each phase, and how a college can request a visit.',
    published: '2026-11-10',
    audience: 'For engineering colleges',
    Body: IndustrialVisits,
  },
  {
    slug: 'visiting-engineers-srinagar',
    title: 'Coming to Srinagar for site work: a note for visiting engineers',
    description: 'Getting to Srinagar, where to stay near Nishat, what the seasons mean for site days and what to pack for a visit to the Dal Lake sewerage project.',
    published: '2026-11-10',
    audience: 'For visiting engineers and consultants',
    Body: VisitingEngineers,
  },
  {
    slug: 'how-sewage-reaches-the-nishat-plant',
    title: 'From house to plant: how sewage will reach the Nishat STP',
    description: 'The Dal Lake sewerage scheme is mostly pipe: 210 km of sewer, 3,728 manholes, 15,814 house chambers and ten pumping stations feeding one plant.',
    published: '2026-11-10',
    audience: 'How the scheme works',
    Body: SewerNetwork,
  },
]

export const BLOG_INDEX = {
  title: 'Blog',
  subtitle: 'Notes from the Dal Lake sewerage project: how the scheme works, and practical guides for anyone visiting it.',
  documentTitle: 'Blog · KIPL Srinagar · Dal Lake Sewerage Scheme',
}

export const postPath = (slug: string) => `${BLOG_PATH}/${slug}`
export const postDocumentTitle = (title: string) => `${title} · KIPL Srinagar`
export const findPost = (slug: string | undefined) => POSTS.find(p => p.slug === slug)

export function formatPostDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

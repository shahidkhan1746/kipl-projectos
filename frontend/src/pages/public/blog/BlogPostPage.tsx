import { Link, useParams } from 'react-router-dom'
import { EmptyState, PublicShell } from '../_SiteChrome'
import { BLOG_AUTHOR, BLOG_PATH, POSTS, findPost, formatPostDate, postDocumentTitle, postPath } from './posts'
import { BLOG_CSS } from './blogStyles'
import { useDocumentTitle } from './useDocumentTitle'

export default function BlogPostPage() {
  const { slug } = useParams()
  const post = findPost(slug)
  useDocumentTitle(post ? postDocumentTitle(post.title) : 'Post not found · KIPL Srinagar')

  if (!post) {
    return (
      <PublicShell title="Post not found">
        <EmptyState text="This post has moved or no longer exists." />
        <p style={{ textAlign: 'center', margin: 0 }}><Link to={BLOG_PATH}>See all posts</Link></p>
      </PublicShell>
    )
  }

  const others = POSTS.filter(p => p.slug !== post.slug).slice(0, 3)
  const { Body } = post
  return (
    <PublicShell title={post.title} subtitle={post.description}>
      <style>{BLOG_CSS}</style>
      <article className="kb kb-col">
        <p className="kb-meta">
          <b>{post.audience}</b>
          <span>{BLOG_AUTHOR}</span>
          <time dateTime={post.updated ?? post.published}>
            {post.updated ? `Updated ${formatPostDate(post.updated)}` : formatPostDate(post.published)}
          </time>
        </p>
        <div className="kb-post"><Body /></div>

        {others.length > 0 && (
          <aside className="kb-foot" aria-labelledby="kb-more">
            <h2 id="kb-more">More from the blog</h2>
            <ul className="kb-list">
              {others.map(p => (
                <li key={p.slug}>
                  <Link className="kb-card" to={postPath(p.slug)}>
                    <p className="kb-meta"><b>{p.audience}</b></p>
                    <h3>{p.title}</h3>
                  </Link>
                </li>
              ))}
            </ul>
            <Link className="kb-back" to={BLOG_PATH}>← All posts</Link>
          </aside>
        )}
      </article>
    </PublicShell>
  )
}

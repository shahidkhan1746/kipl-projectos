import type { CSSProperties } from 'react'
import { parseLinks } from './linkedText'

/** Renders update text with its [text](https://…) links as real links. Never injects HTML. */
export function LinkedText({ text, linkStyle }: { text: string; linkStyle?: CSSProperties }) {
  return (
    <>
      {parseLinks(text).map((s, i) => s.kind === 'text'
        ? <span key={i}>{s.text}</span>
        : <a key={i} href={s.href} target="_blank" rel="noopener" style={linkStyle}>{s.text}</a>)}
    </>
  )
}

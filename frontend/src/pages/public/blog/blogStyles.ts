import { P } from '../_SiteChrome'

/** Reading styles shared by the blog index and posts. Scoped under .kb so nothing leaks. */
export const BLOG_CSS = `
.kb{--ink:${P.ink};--body:${P.body};--faint:${P.faint};--line:${P.line};--water:${P.water};--brand:${P.brand}}
.kb-col{max-width:700px}
.kb-meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin:0 0 26px}
.kb-meta b{color:var(--water);font-weight:600}
.kb-post{color:var(--body);font-size:17px;line-height:1.72}
.kb-post p{margin:0 0 1.1em}
.kb-post .lead{font-size:19px;line-height:1.6;color:var(--ink)}
.kb-post h2{font-weight:700;font-size:24px;line-height:1.25;letter-spacing:-.015em;color:var(--ink);margin:1.9em 0 .55em;text-wrap:balance}
.kb-post h3{font-weight:700;font-size:18px;line-height:1.35;color:var(--ink);margin:1.5em 0 .4em}
.kb-post ul{margin:0 0 1.2em;padding-left:1.2em;list-style:disc}
.kb-post li::marker{color:var(--water)}
.kb-post li{margin:0 0 .5em;padding-left:.2em}
.kb-post b{color:var(--ink);font-weight:650}
.kb-post a{color:var(--water);font-weight:600;text-decoration:underline;text-decoration-thickness:1px;
  text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--water) 40%,transparent)}
.kb-post a:hover{text-decoration-color:currentColor}
.kb-table{overflow-x:auto;margin:0 0 1.4em;border:1px solid var(--line);border-radius:12px;background:#fff}
.kb-post table{width:100%;min-width:560px;border-collapse:collapse;font-size:15px;line-height:1.55}
.kb-post th{text-align:left;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);
  font-weight:600;padding:12px 14px;border-bottom:1px solid var(--line);background:#F7FAF8}
.kb-post td{padding:12px 14px;border-bottom:1px solid var(--line);vertical-align:top}
.kb-post tr:last-child td{border-bottom:0}
.kb-post td:first-child{white-space:nowrap;color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}
.kb-foot{margin-top:44px;padding-top:24px;border-top:1px solid var(--line)}
.kb-foot h2{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:0 0 14px;font-weight:600}
.kb-list{display:grid;gap:14px;margin:0;padding:0;list-style:none}
.kb-card{display:block;background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px 22px;
  text-decoration:none;color:inherit;transition:border-color .2s,box-shadow .2s}
.kb-card:hover{border-color:color-mix(in srgb,var(--water) 45%,var(--line));box-shadow:0 4px 18px rgba(8,25,42,.06)}
.kb-card .kb-meta{margin:0 0 8px}
.kb-card h2,.kb-card h3{font-weight:650;font-size:20px;line-height:1.3;letter-spacing:-.01em;color:var(--ink);margin:0 0 6px;text-wrap:balance}
.kb-card p{margin:0;font-size:15px;line-height:1.6;color:var(--body)}
.kb-back{display:inline-block;margin-top:18px;font-size:14px;font-weight:600;color:var(--water);text-decoration:none}
@media (max-width:640px){
  .kb-post{font-size:16px}
  .kb-post .lead{font-size:17.5px}
  .kb-post h2{font-size:21px}
  .kb-card{padding:18px}
}
`

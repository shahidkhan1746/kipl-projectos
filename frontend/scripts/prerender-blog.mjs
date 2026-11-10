// Writes a static HTML page for every blog URL into dist/, after `vite build`.
//
// The app is a single-page app: without this, every URL returns the same empty
// shell and crawlers, link previews and readers without JavaScript see nothing.
// vercel.json rewrites each blog URL to the file written here.
//
// Run from frontend/: node scripts/prerender-blog.mjs
import { build } from 'vite'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrOut = join(root, 'dist-ssr')

await build({
  root,
  configFile: join(root, 'vite.config.ts'),
  logLevel: 'warn',
  build: {
    ssr: 'src/pages/public/blog/ssr.tsx',
    outDir: ssrOut,
    emptyOutDir: true,
    copyPublicDir: false,
  },
})

try {
  const { staticPages, buildDocument } = await import(pathToFileURL(join(ssrOut, 'ssr.js')).href)
  const template = await readFile(join(dist, 'index.html'), 'utf8')
  for (const page of staticPages()) {
    const file = join(dist, `${page.path}.html`)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, buildDocument(template, page))
    console.log(`prerendered ${page.path} -> dist${page.path}.html`)
  }
} finally {
  await rm(ssrOut, { recursive: true, force: true })
}

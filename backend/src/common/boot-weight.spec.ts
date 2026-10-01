import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

/**
 * The API runs on Render's free tier: 0.1 CPU, and it sleeps when idle, so every
 * sign-in after a quiet spell waits for a full boot. Most of that boot is
 * loading libraries. These are only needed by one feature each (Gmail sending,
 * uploads, document indexing) and are loaded on first use instead. Importing
 * one at the top of a file puts it back on every wake: measured at 0.1 CPU,
 * a wake went from ~61 s to ~35 s and peak memory from ~270 MB to ~138 MB when
 * they were moved out.
 *
 * `import type` is fine (erased at compile time); a value import is not.
 */
const LOAD_ON_FIRST_USE = [
  'googleapis',
  'xlsx',
  'pdf-parse',
  'mammoth',
  'cloudinary',
  '@aws-sdk/client-s3',
  'sharp',
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : []
  })
}

describe('boot weight', () => {
  const root = join(__dirname, '..')

  it.each(LOAD_ON_FIRST_USE)('%s is not loaded at boot', lib => {
    const escaped = lib.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
    const topLevel = new RegExp(
      `^(?:import(?!\\s+type\\b)[^;'"]*?from\\s*['"]${escaped}['"]|(?:const|let|var)\\s+[^=]+=\\s*require\\(\\s*['"]${escaped}['"]\\s*\\))`,
      'm',
    )
    const offenders = sourceFiles(root)
      .filter(file => topLevel.test(readFileSync(file, 'utf8')))
      .map(file => relative(root, file))
    expect(offenders).toEqual([])
  })
})

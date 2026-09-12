import { readFileSync } from 'fs'
import { join } from 'path'
import { globSync } from 'glob'

/** src/shared/entities -> src */
const SRC = join(__dirname, '..', '..')

/** Comments routinely list alternatives with a pipe — `// draft | approved` —
 *  which is not a TypeScript union. Remove them before reading declarations. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

interface Declaration { file: string; property: string; declared: string }

/** Every `@Column(...)` that leaves the column type to inference, paired with
 *  the property it decorates. Stacked decorators in between are skipped. */
function inferredColumns(source: string, file: string): Declaration[] {
  const column = /@Column\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g
  const property = /\s*(?:@\w+\([^()]*\)\s*)*(\w+)\s*[!?]?\s*:\s*([^;=\n]+)/
  const out: Declaration[] = []
  for (const match of source.matchAll(column)) {
    if (match[1].includes('type:')) continue
    const rest = source.slice(match.index! + match[0].length)
    const decl = property.exec(rest)
    if (!decl || decl.index !== 0) continue
    out.push({ file, property: decl[1], declared: decl[2].trim() })
  }
  return out
}

/**
 * A `@Column()` with no explicit type asks TypeORM to read the property's
 * design-time type. TypeScript emits `Object` for a union, so `Date | null`
 * maps to nothing — and TypeORM does not warn or fall back, it refuses to build
 * the schema at all:
 *
 *   Data type "Object" in "User.lockedUntil" is not supported by "postgres"
 *
 * synchronize is on for every NODE_ENV that is not production, so one such
 * property breaks a local boot, a schema sync and any generated migration,
 * while production carries on working because it never synchronises. Five had
 * accumulated before anyone noticed.
 */
describe('entity columns that leave their type to inference', () => {
  const files = globSync(join(SRC, '**/*.entity.ts'))

  it('finds the entity files to check', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('declares an explicit type wherever the property is a union', () => {
    const offenders: string[] = []
    for (const file of files) {
      const source = withoutComments(readFileSync(file, 'utf8'))
      for (const decl of inferredColumns(source, file)) {
        if (!decl.declared.includes('|')) continue
        offenders.push(
          `${file.replace(SRC + '/', '')}: ${decl.property}: ${decl.declared}`,
        )
      }
    }
    expect(offenders).toEqual([])
  })

  it('reads a union declaration as needing a type', () => {
    const source = withoutComments(
      "@Column({ name: 'locked_until', nullable: true })\n  lockedUntil: Date | null;",
    )
    expect(inferredColumns(source, 'x')).toEqual([
      { file: 'x', property: 'lockedUntil', declared: 'Date | null' },
    ])
  })

  it('does not read a pipe inside a comment as a union', () => {
    const source = withoutComments(
      "@Column({ nullable: true })\n  status: string   // draft | approved | paid",
    )
    expect(inferredColumns(source, 'x')[0].declared).toBe('string')
  })

  it('ignores a column that already states its type', () => {
    const source = withoutComments(
      "@Column({ name: 'locked_until', type: 'timestamptz', nullable: true })\n  lockedUntil: Date | null;",
    )
    expect(inferredColumns(source, 'x')).toEqual([])
  })

  it('sees past a stacked decorator to the property', () => {
    const source = withoutComments(
      "@Column({ nullable: true })\n  @Exclude()\n  passwordResetHash: string | null;",
    )
    expect(inferredColumns(source, 'x')[0].property).toBe('passwordResetHash')
  })
})

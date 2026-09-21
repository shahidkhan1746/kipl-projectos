import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { Logger } from '@nestjs/common'
import type { DataSource } from 'typeorm'

/**
 * Applies backend/migrations/*.sql at startup.
 *
 * Production runs with synchronize off, so schema changes are hand-written SQL
 * applied by `npm run migrate`. That is a separate action from deploying, and
 * the day it was forgotten the API booted happily against a database missing
 * the columns its entities declared: every read of the material register threw
 * "column does not exist", and the page reported that it could not load with
 * nothing to say why. The code was deployed and the schema was not, and nothing
 * in the system knew.
 *
 * Running them here makes the two move together. The files are idempotent —
 * every statement is IF NOT EXISTS — so applying them on each boot is a no-op
 * once they have been applied.
 *
 * A failure is logged loudly and recorded for /health, and startup continues. A
 * migration that cannot apply should not take a working API offline with it;
 * what it must not do is fail silently, which is the whole of what went wrong.
 */

export interface MigrationOutcome {
  ran: boolean
  applied: string[]
  skipped: Array<{ file: string; reason: string }>
  failed: Array<{ file: string; error: string }>
}

let lastOutcome: MigrationOutcome = { ran: false, applied: [], skipped: [], failed: [] }

/** What the last startup run did, for the health endpoint to report. */
export function migrationStatus(): MigrationOutcome {
  return lastOutcome
}

/**
 * Where the SQL lives, from wherever this file is running.
 *
 * Compiled to dist/common in production and executed from src/common in
 * development, so both are tried rather than assuming one.
 */
export function migrationsDir(from: string = __dirname, cwd: string = process.cwd()): string | null {
  for (const candidate of [
    join(from, '..', '..', 'migrations'),
    join(from, '..', '..', '..', 'migrations'),
    join(cwd, 'migrations'),
  ]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

/** Filename order, which is date order given the naming convention. */
export function migrationFiles(dir: string): string[] {
  return readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
}

/**
 * Failures that are expected on some hosts and are not a reason to shout.
 *
 * pgvector is not installed everywhere, and a migration for a table a later
 * migration creates is a file-order problem that resolves itself on the next
 * deploy rather than a broken schema.
 */
export function isTolerable(error: { code?: string; message?: string }): string | null {
  const message = error?.message ?? ''
  if (error?.code === '0A000' && message.includes('extension "vector"')) {
    return 'pgvector extension not available on this database host'
  }
  if (error?.code === '42P01') return `relation does not exist yet (${message})`
  return null
}

export async function applyPendingMigrations(
  dataSource: DataSource,
  /** Overridden in tests; production discovers it from the build layout. */
  dirOverride?: string | null,
): Promise<MigrationOutcome> {
  const logger = new Logger('SchemaMigrations')
  const outcome: MigrationOutcome = { ran: true, applied: [], skipped: [], failed: [] }

  const dir = dirOverride !== undefined ? dirOverride : migrationsDir()
  if (!dir) {
    logger.warn('No migrations directory found; schema changes will not be applied automatically.')
    lastOutcome = { ...outcome, ran: false }
    return lastOutcome
  }

  for (const file of migrationFiles(dir)) {
    try {
      await dataSource.query(readFileSync(join(dir, file), 'utf8'))
      outcome.applied.push(file)
    } catch (error: any) {
      const tolerable = isTolerable(error)
      if (tolerable) {
        outcome.skipped.push({ file, reason: tolerable })
        logger.warn(`Skipped ${file}: ${tolerable}`)
      } else {
        outcome.failed.push({ file, error: String(error?.message ?? error) })
        logger.error(`FAILED ${file}: ${error?.message ?? error}`)
      }
    }
  }

  if (outcome.failed.length) {
    logger.error(
      `${outcome.failed.length} migration(s) did not apply. The database schema does not match ` +
      `this build, and endpoints touching the affected tables will fail. See /api/v1/health.`,
    )
  } else {
    logger.log(`Schema up to date (${outcome.applied.length} migration file(s) applied or already present).`)
  }

  lastOutcome = outcome
  return outcome
}

import { isTolerable, migrationFiles, migrationsDir, migrationStatus, applyPendingMigrations } from './schema-migrations'
import { mkdtempSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('migrationFiles', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mig-'))
  beforeAll(() => {
    for (const f of ['2026-09-20-b.sql', '2026-01-01-a.sql', 'notes.md', '2026-12-31-c.sql']) {
      writeFileSync(join(dir, f), '-- noop')
    }
  })

  it('takes only SQL, in filename order', () => {
    expect(migrationFiles(dir)).toEqual(['2026-01-01-a.sql', '2026-09-20-b.sql', '2026-12-31-c.sql'])
  })

  /**
   * The filesystem here happens to hand names back sorted, so a real directory
   * cannot demonstrate that the sort does anything. Directory order is not
   * guaranteed, and a migration applied before the one that creates its table
   * fails — so the ordering is pinned against a listing that is deliberately
   * out of order.
   */
  it('sorts a listing the filesystem returns out of order', () => {
    const fs = require('fs')
    const spy = jest.spyOn(fs, 'readdirSync')
      .mockReturnValue(['2026-12-31-c.sql', '2026-01-01-a.sql', '2026-09-20-b.sql'] as never)
    try {
      expect(migrationFiles('/anywhere')).toEqual([
        '2026-01-01-a.sql', '2026-09-20-b.sql', '2026-12-31-c.sql',
      ])
    } finally {
      spy.mockRestore()
    }
  })
})

describe('migrationsDir', () => {
  it('finds the directory from a compiled location', () => {
    const root = mkdtempSync(join(tmpdir(), 'app-'))
    mkdirSync(join(root, 'migrations'))
    mkdirSync(join(root, 'dist', 'common'), { recursive: true })
    expect(migrationsDir(join(root, 'dist', 'common'))).toBe(join(root, 'migrations'))
  })

  it('is nothing when there is no such directory', () => {
    const bare = mkdtempSync(join(tmpdir(), 'bare-'))
    expect(migrationsDir(join(bare, 'a', 'b'), bare)).toBeNull()
  })
})

/**
 * Some failures are expected on some hosts and are not a broken schema.
 * Treating them as fatal would mean a deploy shouting about pgvector on a
 * database that will never have it.
 */
describe('isTolerable', () => {
  it('tolerates a missing pgvector extension', () => {
    expect(isTolerable({ code: '0A000', message: 'extension "vector" is not available' }))
      .toContain('pgvector')
  })

  it('tolerates a table a later migration creates', () => {
    expect(isTolerable({ code: '42P01', message: 'relation "x" does not exist' }))
      .toContain('does not exist yet')
  })

  it('does not tolerate a real schema failure', () => {
    expect(isTolerable({ code: '42703', message: 'column "grn_id" does not exist' })).toBeNull()
    expect(isTolerable({ message: 'syntax error at or near "ALTR"' })).toBeNull()
    expect(isTolerable({})).toBeNull()
  })
})

describe('applyPendingMigrations', () => {
  const withDir = () => {
    const root = mkdtempSync(join(tmpdir(), 'app-'))
    mkdirSync(join(root, 'migrations'))
    return root
  }

  it('applies every file and reports them', async () => {
    const root = withDir()
    writeFileSync(join(root, 'migrations', '01.sql'), 'ALTER TABLE t ADD COLUMN a int')
    writeFileSync(join(root, 'migrations', '02.sql'), 'ALTER TABLE t ADD COLUMN b int')
    const query = jest.fn().mockResolvedValue(undefined)
    const out = await applyPendingMigrations({ query } as any, join(root, 'migrations'))
    expect(out.applied).toEqual(['01.sql', '02.sql'])
    expect(out.failed).toEqual([])
    expect(query).toHaveBeenCalledTimes(2)
  })

  // The failure that caused this: the code shipped, the schema did not, and
  // nothing anywhere said so.
  it('records a real failure rather than swallowing it', async () => {
    const root = withDir()
    writeFileSync(join(root, 'migrations', '01.sql'), 'bad sql')
    const query = jest.fn().mockRejectedValue({ code: '42703', message: 'column does not exist' })
    const out = await applyPendingMigrations({ query } as any, join(root, 'migrations'))
    expect(out.failed).toHaveLength(1)
    expect(out.failed[0].file).toBe('01.sql')
    expect(migrationStatus().failed).toHaveLength(1)
  })

  it('keeps going after one file fails, so a later fix still applies', async () => {
    const root = withDir()
    writeFileSync(join(root, 'migrations', '01.sql'), 'bad')
    writeFileSync(join(root, 'migrations', '02.sql'), 'good')
    const query = jest.fn()
      .mockRejectedValueOnce({ code: '42703', message: 'nope' })
      .mockResolvedValueOnce(undefined)
    const out = await applyPendingMigrations({ query } as any, join(root, 'migrations'))
    expect(out.applied).toEqual(['02.sql'])
    expect(out.failed).toHaveLength(1)
  })

  it('separates a tolerated skip from a failure', async () => {
    const root = withDir()
    writeFileSync(join(root, 'migrations', '01.sql'), 'CREATE EXTENSION vector')
    const query = jest.fn().mockRejectedValue({ code: '0A000', message: 'extension "vector" is not available' })
    const out = await applyPendingMigrations({ query } as any, join(root, 'migrations'))
    expect(out.skipped).toHaveLength(1)
    expect(out.failed).toHaveLength(0)
  })
})

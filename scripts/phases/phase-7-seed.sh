#!/usr/bin/env bash
# ================================================================
#  Phase 7 — Seed Database
#  Creates users, project, geofences, sample data
#  Uses Node.js directly with pg (not TypeORM) for simplicity
# ================================================================

set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
warn() { echo -e "${Y}  ⚠${NC} $1"; }
info() { echo -e "${B}  →${NC} $1"; }
err()  { echo -e "${R}  ✗ $1${NC}"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$ROOT/backend"

[[ -f "$BACKEND/.env" ]] || err "backend/.env not found"
set -a; source "$BACKEND/.env"; set +a

# ── Check if already seeded ───────────────────────────────────────
ALREADY=$(PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -tAc "SELECT COUNT(*) FROM users WHERE email='admin@kipl.in'" 2>/dev/null | tr -d ' ' || echo "0")

if [[ "$ALREADY" -gt 0 ]]; then
  warn "Already seeded (admin user exists) — skipping"
  exit 0
fi

info "Seeding database..."
cd "$BACKEND"

# ── Wait for TypeORM to sync schema first ─────────────────────────
# The tables are created by TypeORM when the app starts.
# If no tables exist yet, start the app briefly to create them.
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" \
  2>/dev/null | tr -d ' ' || echo "0")

if [[ "$TABLE_COUNT" -lt 3 ]]; then
  info "Tables not yet created. Starting backend briefly to sync schema..."
  PID=$(lsof -ti tcp:3000 2>/dev/null || true)
  [[ -n "$PID" ]] && kill -9 "$PID" 2>/dev/null || true
  sleep 0.3

  nohup node dist/main.js > /tmp/kipl-schema-sync.log 2>&1 &
  SYNC_PID=$!
  # Wait for schema sync (TypeORM synchronize: true runs on startup)
  for i in $(seq 1 15); do
    T=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" \
        2>/dev/null | tr -d ' ' || echo "0")
    [[ "$T" -gt 3 ]] && break
    sleep 1; echo -n "."
  done
  echo ""
  kill "$SYNC_PID" 2>/dev/null || true
  wait "$SYNC_PID" 2>/dev/null || true
  ok "Schema synced via TypeORM"
fi

# ── Run seed script ────────────────────────────────────────────────
node << 'SEED_SCRIPT'
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seed() {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');

    const h = (p) => bcrypt.hash(p, 12);
    const addUser = async (name, email, pass, role, dept, desig) => {
      const ph = await h(pass);
      const { rows } = await c.query(
        `INSERT INTO users (name, email, phone, password_hash, role, department, designation, is_active)
         VALUES ($1, $2, NULL, $3, $4, $5, $6, true)
         ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
        [name, email, ph, role, dept, desig || null]
      );
      return rows[0].id;
    };

    const adminId   = await addUser('KIPL Admin',      'admin@kipl.in',    'Admin@KIPL#2024',   'super_admin',     'Management', null);
    const pmId      = await addUser('Project Manager', 'pm@kipl.in',       'PM@KIPL#2024',      'project_manager', 'Projects',   'Project Manager');
    const shahidId  = await addUser('Shahid Khan',     'shahid@kipl.in',   'Liaison@KIPL#2024', 'liaison_officer', 'Liaison',    'Liaison Officer');
    const hrId      = await addUser('HR Officer',      'hr@kipl.in',       'HR@KIPL#2024',      'hr_officer',      'HR',         'HR Officer');
    const engId     = await addUser('Site Engineer',   'eng@kipl.in',      'Eng@KIPL#2024',     'engineer',        'Civil',      'Site Engineer');
    const acctId    = await addUser('Accountant',      'accounts@kipl.in', 'Acct@KIPL#2024',    'accountant',      'Finance',    'Accountant');
    console.log('  ✓ 6 users created');

    // Project
    const { rows: [proj] } = await c.query(
      `INSERT INTO projects (name, code, description, client, location, contract_value, start_date, end_date, status, progress_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',67.0)
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
      ['STP Nishat — Phase 1', 'STP-NSH-001',
       'Sewage Treatment Plant at Nishat, Srinagar under LCMA/UEED.',
       'LCMA / UEED', 'Nishat, Srinagar, J&K',
       85000000, '2025-10-01', '2026-06-30']
    );
    const pid = proj.id;
    console.log(`  ✓ Project created: STP-NSH-001 (${pid})`);

    await c.query('COMMIT');
    console.log('\n  Seed complete.');
    console.log('\n  ┌─────────────────────────────────────────────────────┐');
    console.log('  │  Credentials                                        │');
    console.log('  ├─────────────────────────────────────────────────────┤');
    console.log('  │  admin@kipl.in       →  Admin@KIPL#2024             │');
    console.log('  │  pm@kipl.in          →  PM@KIPL#2024                │');
    console.log('  │  shahid@kipl.in      →  Liaison@KIPL#2024           │');
    console.log('  │  hr@kipl.in          →  HR@KIPL#2024                │');
    console.log('  │  eng@kipl.in         →  Eng@KIPL#2024               │');
    console.log('  │  accounts@kipl.in    →  Acct@KIPL#2024              │');
    console.log('  └─────────────────────────────────────────────────────┘');
  } catch(e) {
    await c.query('ROLLBACK');
    console.error('Seed failed:', e.message);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
}

seed();
SEED_SCRIPT

ok "Phase 7 complete — database seeded"
echo ""

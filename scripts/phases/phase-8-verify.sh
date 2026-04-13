#!/usr/bin/env bash
# ================================================================
#  Phase 8 — Full System Verification
#  Tests: PostgreSQL, backend API, login, all modules respond
# ================================================================

set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; NC='\033[0m'; BOLD='\033[1m'
ok()     { echo -e "${G}  ✓${NC} $1"; }
warn()   { echo -e "${Y}  ⚠${NC} $1"; }
info()   { echo -e "${B}  →${NC} $1"; }
fail()   { echo -e "${R}  ✗${NC} $1"; FAILS=$((FAILS+1)); }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$ROOT/backend"
FAILS=0
API="http://localhost:3000/api/v1"

[[ -f "$BACKEND/.env" ]] || { echo "backend/.env missing"; exit 1; }
set -a; source "$BACKEND/.env"; set +a

echo -e "\n${BOLD}System Verification${NC}\n"

# ── 1. PostgreSQL ──────────────────────────────────────────────────
info "PostgreSQL..."
PG=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" \
     -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 'ok'" 2>/dev/null || echo "fail")
[[ "$PG" == "ok" ]] && ok "PostgreSQL connected" || fail "PostgreSQL not reachable"

# ── 2. Backend running ─────────────────────────────────────────────
info "Backend API..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/auth/me" 2>/dev/null || echo "000")
if [[ "$STATUS" == "401" ]]; then
  ok "Backend running (got expected 401 on /auth/me)"
elif [[ "$STATUS" == "200" ]]; then
  ok "Backend running (HTTP 200)"
else
  fail "Backend not responding (HTTP $STATUS) — is it started?"
fi

# ── 3. Login test ─────────────────────────────────────────────────
info "Auth — login..."
LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kipl.in","password":"Admin@KIPL#2024"}' 2>/dev/null)

TOKEN=$(echo "$LOGIN" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try{ console.log(JSON.parse(d).access_token||''); }catch{ console.log(''); }
  });" 2>/dev/null || echo "")

if [[ -n "$TOKEN" ]]; then
  ok "Login successful — JWT obtained"
else
  fail "Login failed: $LOGIN"
fi

AUTH="Authorization: Bearer $TOKEN"

# ── 4. Auth /me ────────────────────────────────────────────────────
info "GET /auth/me..."
ME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/auth/me" -H "$AUTH" 2>/dev/null || echo "000")
[[ "$ME_STATUS" == "200" ]] && ok "/auth/me → 200" || fail "/auth/me → $ME_STATUS"

# ── 5. Projects ────────────────────────────────────────────────────
info "GET /projects..."
PROJ_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API/projects" -H "$AUTH" 2>/dev/null || echo "000")
[[ "$PROJ_STATUS" == "200" ]] && ok "/projects → 200" || fail "/projects → $PROJ_STATUS"

# ── 6. Database record counts ─────────────────────────────────────
info "Database records..."
count() {
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" \
    -U "$DB_USER" -d "$DB_NAME" \
    -tAc "SELECT COUNT(*) FROM $1" 2>/dev/null | tr -d ' ' || echo "?"
}

printf "  %-20s %s\n" "users:"    "$(count users)"
printf "  %-20s %s\n" "projects:" "$(count projects)"

# ── 7. Frontend ────────────────────────────────────────────────────
info "Frontend..."
FE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173" 2>/dev/null || echo "000")
if [[ "$FE" == "200" ]]; then
  ok "Frontend running on http://localhost:5173"
else
  warn "Frontend not running — start it with: cd frontend && npm run dev"
fi

# ── Summary ────────────────────────────────────────────────────────
echo ""
if [[ $FAILS -eq 0 ]]; then
  echo -e "${G}${BOLD}  ✓ All checks passed${NC}"
else
  echo -e "${R}${BOLD}  ✗ $FAILS check(s) failed — see above${NC}"
fi

echo ""
echo -e "${BOLD}  URLs:${NC}"
echo -e "  Backend  → http://localhost:3000"
echo -e "  Frontend → http://localhost:5173"
echo ""
echo -e "${BOLD}  Credentials:${NC}"
printf "  %-20s %s\n" "admin@kipl.in"     "Admin@KIPL#2024"
printf "  %-20s %s\n" "shahid@kipl.in"    "Liaison@KIPL#2024"
printf "  %-20s %s\n" "pm@kipl.in"        "PM@KIPL#2024"
printf "  %-20s %s\n" "hr@kipl.in"        "HR@KIPL#2024"
printf "  %-20s %s\n" "eng@kipl.in"       "Eng@KIPL#2024"
printf "  %-20s %s\n" "accounts@kipl.in"  "Acct@KIPL#2024"
echo ""

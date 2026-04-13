#!/usr/bin/env bash
# ================================================================
#  KIPL ProjectOS — Start (run every day)
#  Starts PostgreSQL, backend, and frontend
#  Usage: bash start.sh
# ================================================================

set -euo pipefail

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; NC='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
warn() { echo -e "${Y}  ⚠${NC} $1"; }
info() { echo -e "${B}  →${NC} $1"; }
err()  { echo -e "${R}  ✗ $1${NC}"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

[[ -f "$BACKEND/.env" ]]          || err "backend/.env missing — run setup.sh first"
[[ -d "$BACKEND/node_modules" ]]  || err "Backend packages missing — run setup.sh first"
[[ -d "$FRONTEND/node_modules" ]] || err "Frontend packages missing — run setup.sh first"

set -a; source "$BACKEND/.env"; set +a

# ── PostgreSQL ────────────────────────────────────────────────────
info "Checking PostgreSQL..."
PG=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" \
     -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1" 2>/dev/null || echo "")

if [[ "$PG" != "1" ]]; then
  info "Starting PostgreSQL..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql@15 2>/dev/null || pg_ctl start 2>/dev/null || true
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "mingw"* ]]; then
    net start postgresql* 2>/dev/null || true
  else
    sudo systemctl start postgresql 2>/dev/null || true
  fi
  sleep 2
fi
ok "PostgreSQL ready"

# ── Clear ports ────────────────────────────────────────────────────
for PORT in 3000 5173; do
  PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)
  [[ -n "$PID" ]] && { kill -9 "$PID" 2>/dev/null || true; warn "Cleared port $PORT"; }
done
sleep 0.3

# ── Backend ────────────────────────────────────────────────────────
info "Starting NestJS backend..."
mkdir -p "$BACKEND/logs"
cd "$BACKEND"
nohup npm run start:dev > "$BACKEND/logs/api.log" 2>&1 &
echo $! > "$BACKEND/logs/api.pid"

for i in $(seq 1 20); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/auth/me" 2>/dev/null || echo "000")
  [[ "$STATUS" == "401" ]] || [[ "$STATUS" == "200" ]] && break
  sleep 1; echo -n "."
done
echo ""
ok "Backend on http://localhost:3000  (PID $(cat "$BACKEND/logs/api.pid"))"

# ── Frontend ────────────────────────────────────────────────────────
info "Starting React frontend..."
cd "$FRONTEND"
nohup npm run dev > "$BACKEND/logs/frontend.log" 2>&1 &
echo $! > "$BACKEND/logs/frontend.pid"

for i in $(seq 1 30); do
  curl -sf "http://localhost:5173" &>/dev/null && break
  sleep 1; echo -n "."
done
echo ""
if curl -sf "http://localhost:5173" &>/dev/null; then
  ok "Frontend on http://localhost:5173  (PID $(cat "$BACKEND/logs/frontend.pid"))"
else
  warn "Frontend still compiling — open http://localhost:5173 in ~20s"
fi

echo ""
echo -e "${G}${BOLD}  KIPL ProjectOS is running${NC}"
echo -e "  ${BOLD}Web:${NC}     http://localhost:5173"
echo -e "  ${BOLD}API:${NC}     http://localhost:3000"
echo -e "  ${BOLD}Stop:${NC}    bash stop.sh"
echo ""

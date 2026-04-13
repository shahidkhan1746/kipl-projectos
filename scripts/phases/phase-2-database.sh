#!/usr/bin/env bash
# ================================================================
#  Phase 2 — Database Setup (Windows Git Bash compatible)
#  Uses -c flags throughout, no heredoc in functions
# ================================================================

set -euo pipefail

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
warn() { echo -e "${Y}  ⚠${NC} $1"; }
err()  { echo -e "${R}  ✗ $1${NC}"; exit 1; }
info() { echo -e "${B}  →${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DB_NAME="kipl_projectos"
DB_USER="kipl_user"
DB_HOST="localhost"
DB_PORT="5432"

info "Generating secure secrets..."
DB_PASSWORD=$(node -e "const c='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';let p='';require('crypto').randomBytes(20).forEach(b=>p+=c[b%c.length]);console.log(p);")
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
ok "Secrets generated"

BACKEND_ENV="$ROOT/backend/.env"
if [[ -f "$BACKEND_ENV" ]]; then
  warn "backend/.env already exists — loading existing values"
  DB_PASSWORD=$(grep '^DB_PASSWORD=' "$BACKEND_ENV" | cut -d= -f2 || echo "$DB_PASSWORD")
else
  info "Writing backend/.env..."
  mkdir -p "$ROOT/backend"
  {
    echo "NODE_ENV=development"
    echo "PORT=3000"
    echo "DB_HOST=${DB_HOST}"
    echo "DB_PORT=${DB_PORT}"
    echo "DB_NAME=${DB_NAME}"
    echo "DB_USER=${DB_USER}"
    echo "DB_PASSWORD=${DB_PASSWORD}"
    echo "JWT_SECRET=${JWT_SECRET}"
    echo "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}"
    echo "JWT_EXPIRES_IN=15m"
    echo "JWT_REFRESH_EXPIRES_IN=7d"
    echo "CLOUDINARY_CLOUD_NAME=your_cloud_name"
    echo "CLOUDINARY_API_KEY=your_api_key"
    echo "CLOUDINARY_API_SECRET=your_api_secret"
    echo "FRONTEND_URL=http://localhost:5173"
  } > "$BACKEND_ENV"
  ok "backend/.env written"
fi

FRONTEND_ENV="$ROOT/frontend/.env"
if [[ ! -f "$FRONTEND_ENV" ]]; then
  mkdir -p "$ROOT/frontend"
  echo "VITE_API_URL=http://localhost:3000" > "$FRONTEND_ENV"
  echo "VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name" >> "$FRONTEND_ENV"
  ok "frontend/.env written"
fi

info "Setting up PostgreSQL..."
echo ""
echo -e "  ${Y}Enter the password you set when installing PostgreSQL${NC}"
echo -e "  (typing will be hidden)"
echo -n "  postgres password: "
read -rs PG_SUPER_PASS
echo ""

info "Verifying connection..."
PGPASSWORD="$PG_SUPER_PASS" psql -U postgres -h "$DB_HOST" -p "$DB_PORT" \
  -tAc "SELECT 1" > /dev/null 2>&1 \
  || err "Cannot connect as postgres. Is PostgreSQL running? Wrong password?"
ok "Connected as postgres"

# Create user
USER_EXISTS=$(PGPASSWORD="$PG_SUPER_PASS" psql -U postgres -h "$DB_HOST" -p "$DB_PORT" \
  -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null | tr -d '[:space:]' || echo "")

if [[ "$USER_EXISTS" == "1" ]]; then
  warn "User '${DB_USER}' already exists — updating password"
  PGPASSWORD="$PG_SUPER_PASS" psql -U postgres -h "$DB_HOST" -p "$DB_PORT" \
    -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" > /dev/null 2>&1 || true
else
  PGPASSWORD="$PG_SUPER_PASS" psql -U postgres -h "$DB_HOST" -p "$DB_PORT" \
    -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" > /dev/null 2>&1 \
    || err "Failed to create user"
  ok "User '${DB_USER}' created"
fi

# Create database
DB_EXISTS=$(PGPASSWORD="$PG_SUPER_PASS" psql -U postgres -h "$DB_HOST" -p "$DB_PORT" \
  -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null | tr -d '[:space:]' || echo "")

if [[ "$DB_EXISTS" == "1" ]]; then
  warn "Database '${DB_NAME}' already exists — skipping"
else
  PGPASSWORD="$PG_SUPER_PASS" psql -U postgres -h "$DB_HOST" -p "$DB_PORT" \
    -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" > /dev/null 2>&1 \
    || err "Failed to create database"
  ok "Database '${DB_NAME}' created"
fi

# Grant privileges
PGPASSWORD="$PG_SUPER_PASS" psql -U postgres -h "$DB_HOST" -p "$DB_PORT" \
  -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" > /dev/null 2>&1 || true
PGPASSWORD="$PG_SUPER_PASS" psql -U postgres -h "$DB_HOST" -p "$DB_PORT" \
  -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" > /dev/null 2>&1 || true
ok "Privileges granted"

# Test app connection
CONN=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" \
  -U "$DB_USER" -d "$DB_NAME" \
  -tAc "SELECT 'ok'" 2>/dev/null | tr -d '[:space:]' || echo "fail")

[[ "$CONN" == "ok" ]] || err "App user connection failed. Check PostgreSQL logs."
ok "App connection verified"

mkdir -p "$ROOT/backend/uploads"
ok "uploads/ directory created"

echo ""
ok "Phase 2 complete — database ready"
echo -e "  Database : ${DB_NAME}"
echo -e "  User     : ${DB_USER}"
echo -e "  ${Y}Fill in Cloudinary credentials in backend/.env when ready${NC}"
echo ""

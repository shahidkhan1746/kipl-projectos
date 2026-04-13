#!/usr/bin/env bash
# ================================================================
#  Phase 1 — Check System Dependencies
#  Verifies Node 18+, npm, PostgreSQL, Git are installed.
#  Works on: Windows (Git Bash/MINGW64), macOS, Linux
# ================================================================

set -euo pipefail

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; B='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'
ok()   { echo -e "${G}  ✓${NC} $1"; }
warn() { echo -e "${Y}  ⚠${NC} $1"; }
err()  { echo -e "${R}  ✗ $1${NC}"; echo -e "    ${Y}Fix: $2${NC}"; exit 1; }
info() { echo -e "${B}  →${NC} $1"; }

# ── Detect environment ────────────────────────────────────────────
IS_WINDOWS=false
IS_MAC=false
IS_LINUX=false

if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "mingw"* ]] || [[ "$OSTYPE" == "cygwin" ]]; then
  IS_WINDOWS=true
  info "Environment: Windows (Git Bash / MINGW64)"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  IS_MAC=true
  info "Environment: macOS"
else
  IS_LINUX=true
  info "Environment: Linux"
fi

echo ""

# ── Node.js ───────────────────────────────────────────────────────
info "Checking Node.js..."
if ! command -v node &>/dev/null; then
  err "Node.js not found" \
      "Download and install from https://nodejs.org (LTS version)"
fi

NODE_VERSION=$(node --version | tr -d 'v' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 18 ]]; then
  err "Node.js version $(node --version) is too old (need 18+)" \
      "Download Node.js 20 LTS from https://nodejs.org"
fi
ok "Node.js $(node --version)"

# ── npm ──────────────────────────────────────────────────────────
info "Checking npm..."
command -v npm &>/dev/null || err "npm not found" "Reinstall Node.js from https://nodejs.org"
ok "npm $(npm --version)"

# ── PostgreSQL ────────────────────────────────────────────────────
info "Checking PostgreSQL..."
if ! command -v psql &>/dev/null; then
  if [[ "$IS_WINDOWS" == true ]]; then
    err "PostgreSQL (psql) not found" \
        "Download from https://www.postgresql.org/download/windows/ and add to PATH"
  elif [[ "$IS_MAC" == true ]]; then
    err "PostgreSQL not found" \
        "Run: brew install postgresql@15 && brew services start postgresql@15"
  else
    err "PostgreSQL not found" \
        "Run: sudo apt install postgresql postgresql-contrib"
  fi
fi
ok "PostgreSQL $(psql --version | awk '{print $3}')"

# ── Git ───────────────────────────────────────────────────────────
info "Checking Git..."
command -v git &>/dev/null || err "Git not found" "Download from https://git-scm.com"
ok "Git $(git --version | awk '{print $3}')"

# ── NestJS CLI ────────────────────────────────────────────────────
info "Checking NestJS CLI..."
if ! command -v nest &>/dev/null; then
  warn "NestJS CLI not installed — installing globally..."
  npm install -g @nestjs/cli --silent
  ok "NestJS CLI installed"
else
  ok "NestJS CLI $(nest --version 2>/dev/null || echo 'installed')"
fi

# ── Flutter (optional — can install later) ────────────────────────
info "Checking Flutter..."
if ! command -v flutter &>/dev/null; then
  warn "Flutter not found — mobile app build will be skipped"
  warn "Install Flutter from https://flutter.dev/docs/get-started/install"
  warn "Phase 5 (Flutter scaffold) will generate files but not run flutter pub get"
else
  ok "Flutter $(flutter --version --machine 2>/dev/null | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try{ const j=JSON.parse(d); console.log(j.frameworkVersion||'installed'); }
      catch(e){ console.log('installed'); }
    });" 2>/dev/null || echo 'installed')"
fi

# ── Cloudinary — just remind user ────────────────────────────────
echo ""
echo -e "  ${BOLD}Cloudinary credentials needed later:${NC}"
echo -e "  Sign up free at https://cloudinary.com"
echo -e "  You will need: Cloud Name, API Key, API Secret"
echo -e "  These go into backend/.env when prompted"
echo ""

ok "All required dependencies are present"

#!/usr/bin/env bash
# ================================================================
#  KIPL ProjectOS — Master Setup
#  Runs all phases in order.
#  Usage (Git Bash on Windows): bash setup.sh
#  Usage (macOS/Linux):         bash setup.sh
# ================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colours ──────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'
B='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

header() {
  echo -e "\n${BOLD}${B}╔══════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${B}║  $1${NC}"
  echo -e "${BOLD}${B}╚══════════════════════════════════════════╝${NC}\n"
}

ok()  { echo -e "${G}  ✓${NC} $1"; }
err() { echo -e "${R}  ✗ $1${NC}"; exit 1; }

# ── Banner ────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${B}"
cat << 'BANNER'
  ██╗  ██╗██╗██████╗ ██╗
  ██║ ██╔╝██║██╔══██╗██║
  █████╔╝ ██║██████╔╝██║
  ██╔═██╗ ██║██╔═══╝ ██║
  ██║  ██╗██║██║     ███████╗
  ╚═╝  ╚═╝╚═╝╚═╝     ╚══════╝
  ProjectOS — Full Build
BANNER
echo -e "${NC}"

echo -e "  ${BOLD}Stack:${NC}"
echo -e "  Backend  → NestJS + TypeORM + PostgreSQL"
echo -e "  Frontend → React + Vite + Tailwind v4"
echo -e "  Mobile   → Flutter"
echo -e "  Files    → Cloudinary"
echo ""

# ── Phase list ────────────────────────────────────────────────────
PHASES=(
  "phases/phase-1-check-deps.sh    | Check system dependencies"
  "phases/phase-2-database.sh      | Create PostgreSQL database"
  "phases/phase-3-backend.sh       | Scaffold NestJS backend"
  "phases/phase-4-frontend.sh      | Scaffold React + Vite frontend"
  "phases/phase-5-flutter.sh       | Scaffold Flutter mobile app"
  "phases/phase-6-connect.sh       | Connect frontend to backend"
  "phases/phase-7-seed.sh          | Seed database with sample data"
  "phases/phase-8-verify.sh        | Verify everything is working"
)

echo -e "  ${BOLD}Phases to run:${NC}"
for phase in "${PHASES[@]}"; do
  label="${phase##*| }"
  echo -e "  ${B}→${NC} $label"
done
echo ""

echo -n "  Press Enter to begin (Ctrl+C to cancel)..."
read -r

START=$(date +%s)

for phase_entry in "${PHASES[@]}"; do
  script="${phase_entry%% |*}"
  label="${phase_entry##*| }"
  script="${script// /}"  # trim spaces

  header "$label"

  PHASE_PATH="$SCRIPT_DIR/$script"
  [[ -f "$PHASE_PATH" ]] || err "Script not found: $script"

  bash "$PHASE_PATH" || err "Failed at: $label"
  ok "$label — done"
done

END=$(date +%s)
ELAPSED=$((END - START))

echo -e "\n${G}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   KIPL ProjectOS setup complete!        ║"
echo "  ║                                          ║"
echo "  ║   Backend  → http://localhost:3000       ║"
echo "  ║   Frontend → http://localhost:5173       ║"
echo "  ║                                          ║"
echo "  ║   Time: ${ELAPSED}s                            ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${BOLD}Default login:${NC}"
echo -e "  Email    : admin@kipl.in"
echo -e "  Password : Admin@KIPL#2024"
echo ""
echo -e "  ${Y}Next time just run: bash start.sh${NC}"
echo ""

#!/usr/bin/env bash
# KIPL ProjectOS — Stop
# Usage: bash stop.sh

G='\033[0;32m'; Y='\033[1;33m'; NC='\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/backend/logs"
stopped=0

stop_pid() {
  local name="$1" file="$2"
  [[ -f "$file" ]] || return
  local pid; pid=$(cat "$file")
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" && echo -e "${G}  ✓ $name stopped${NC}"
    stopped=$((stopped+1))
  fi
  rm -f "$file"
}

stop_port() {
  local pid; pid=$(lsof -ti tcp:"$1" 2>/dev/null || true)
  [[ -n "$pid" ]] && kill -9 "$pid" 2>/dev/null && \
    echo -e "${G}  ✓ Port $1 freed${NC}" && stopped=$((stopped+1)) || true
}

stop_pid "Backend"  "$LOG_DIR/api.pid"
stop_pid "Frontend" "$LOG_DIR/frontend.pid"
stop_port 3000
stop_port 5173

[[ $stopped -eq 0 ]] && echo -e "${Y}  Nothing was running${NC}" || \
  echo -e "${G}  All stopped${NC}"

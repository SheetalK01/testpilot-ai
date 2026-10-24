#!/usr/bin/env bash
# Runs the whole stack locally without Docker:
#   backend   http://localhost:8080  (Spring Boot, in-memory H2)
#   AI engine http://localhost:8000  (FastAPI, AI_MODE from .env, default mock)
#   frontend  http://localhost:5173  (Vite dev server, proxies /api to the backend)
# Ctrl+C stops all three.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-$(command -v python3.12 || command -v python3)}"
PIDS=()

log() { printf '\033[1;35m[dev]\033[0m %s\n' "$*"; }

cleanup() {
  log "Stopping..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  log "Stopped."
}
trap cleanup EXIT INT TERM

wait_for() {
  local name="$1" url="$2"
  for _ in $(seq 1 90); do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "$name is up ($url)"
      return 0
    fi
    sleep 1
  done
  log "$name did not start in time; check the output above." && exit 1
}

# Values from the repo-root .env (e.g. AI_MODE, ANTHROPIC_API_KEY) are passed to every process.
# An AI_MODE given on the command line wins over .env (e.g. AI_MODE=live ./scripts/dev-local.sh).
CLI_AI_MODE="${AI_MODE:-}"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi
if [[ -n "$CLI_AI_MODE" ]]; then
  export AI_MODE="$CLI_AI_MODE"
fi
# Local dev always uses the in-memory H2 database, even if .env points at the compose MySQL.
unset DB_URL DB_USERNAME DB_PASSWORD

log "Preparing AI engine virtualenv..."
if [[ ! -d "$ROOT/ai_engine/.venv" ]]; then
  "$PYTHON" -m venv "$ROOT/ai_engine/.venv"
fi
"$ROOT/ai_engine/.venv/bin/pip" install -q -r "$ROOT/ai_engine/requirements.txt"

log "Installing frontend dependencies..."
(cd "$ROOT/frontend" && [[ -d node_modules ]] || npm ci --no-audit --no-fund)

log "Starting AI engine (AI_MODE=${AI_MODE:-mock})..."
(cd "$ROOT/ai_engine" && exec .venv/bin/uvicorn app.main:app --port 8000) &
PIDS+=($!)

log "Starting backend..."
(cd "$ROOT/testpilot_backend" && exec ./mvnw -q spring-boot:run) &
PIDS+=($!)

wait_for "AI engine" "http://localhost:8000/health"
wait_for "Backend" "http://localhost:8080/actuator/health"

log "Starting frontend..."
(cd "$ROOT/frontend" && exec npm run dev -- --strictPort) &
PIDS+=($!)

wait_for "Frontend" "http://localhost:5173"
log "Ready: open http://localhost:5173  (API docs: http://localhost:8080/swagger-ui.html)"
wait

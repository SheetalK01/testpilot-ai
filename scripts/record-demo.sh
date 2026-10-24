#!/usr/bin/env bash
# Records the demo video (docs/demo/testpilot-demo.mp4) and the README GIF (docs/screenshots/demo.gif).
#
#   ./scripts/record-demo.sh                 # mock AI: free, deterministic
#   AI_MODE=live ./scripts/record-demo.sh    # real Claude output (needs ANTHROPIC_API_KEY in .env)
#
# Starts the local stack with scripts/dev-local.sh, records with Playwright, converts with ffmpeg,
# then stops everything. Needs ffmpeg (brew install ffmpeg) and nothing else running on 5173/8000/8080.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${AI_MODE:-mock}"
LOG="$(mktemp -t testpilot-record.XXXXXX)"

command -v ffmpeg >/dev/null || { echo "ffmpeg is required: brew install ffmpeg"; exit 1; }

echo "Starting the app (AI_MODE=$MODE)..."
AI_MODE="$MODE" "$ROOT/scripts/dev-local.sh" >"$LOG" 2>&1 &
STACK_PID=$!
trap 'kill "$STACK_PID" 2>/dev/null || true; wait "$STACK_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 200); do
  grep -q "Ready:" "$LOG" && break
  kill -0 "$STACK_PID" 2>/dev/null || { cat "$LOG"; echo "The app failed to start."; exit 1; }
  sleep 2
done
grep -q "Ready:" "$LOG" || { tail -40 "$LOG"; echo "The app did not start in time."; exit 1; }

ACTUAL_MODE="$(curl -s http://localhost:8000/health | sed -E 's/.*"mode":"([a-z]+)".*/\1/')"
if [[ "$ACTUAL_MODE" != "$MODE" ]]; then
  echo "The AI engine is running in '$ACTUAL_MODE' mode, not '$MODE'."
  echo "For live mode, put ANTHROPIC_API_KEY=... in .env first."
  exit 1
fi

(cd "$ROOT/e2e" && { [[ -d node_modules ]] || npm ci --no-audit --no-fund; } && npx playwright install chromium >/dev/null)
echo "Recording..."
BASE_URL=http://localhost:5173 node "$ROOT/scripts/record-demo.js"
echo "Done. Review the video, then commit docs/demo/testpilot-demo.mp4 and docs/screenshots/demo.gif."

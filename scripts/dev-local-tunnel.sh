#!/usr/bin/env bash
# dev-local-tunnel.sh — local API + Metro, both via Cloudflare tunnel (no ngrok)
#
# Usage: pnpm dev
#
# Prerequisites:
#   - cloudflared installed: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
#   - Docker running (for Postgres + Redis)

set -euo pipefail

cleanup() {
  echo ""
  echo "Shutting down..."
  [[ -n "${API_PID:-}" ]]   && kill "$API_PID"   2>/dev/null || true
  [[ -n "${CF_API_PID:-}" ]] && kill "$CF_API_PID" 2>/dev/null || true
  [[ -n "${CF_METRO_PID:-}" ]] && kill "$CF_METRO_PID" 2>/dev/null || true
  rm -f "${API_LOG:-}" "${METRO_LOG:-}"
}
trap cleanup EXIT INT TERM

# ── checks ────────────────────────────────────────────────────────────────────

if ! command -v cloudflared &>/dev/null; then
  echo "Error: cloudflared not found."
  echo "Install: wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O ~/.local/bin/cloudflared && chmod +x ~/.local/bin/cloudflared"
  exit 1
fi

# ── wait helper ───────────────────────────────────────────────────────────────

wait_for_tunnel_url() {
  local log="$1"
  local url=""
  for _ in $(seq 1 30); do
    url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log" 2>/dev/null | head -1 || true)
    [[ -n "$url" ]] && echo "$url" && return 0
    sleep 1
  done
  echo "Error: timed out waiting for tunnel. cloudflared output:" >&2
  cat "$log" >&2
  return 1
}

# ── start DB ──────────────────────────────────────────────────────────────────

echo "Starting Postgres + Redis..."
pnpm db:up
pnpm db:wait

# ── start CF tunnels first (they wait for the service to come up) ─────────────

API_LOG=$(mktemp)
METRO_LOG=$(mktemp)

echo "Starting Cloudflare tunnels..."
cloudflared tunnel --url http://localhost:4000 2>"$API_LOG" &
CF_API_PID=$!

cloudflared tunnel --url http://localhost:8081 2>"$METRO_LOG" &
CF_METRO_PID=$!

echo "Waiting for tunnel URLs..."
API_URL=$(wait_for_tunnel_url "$API_LOG")
METRO_URL=$(wait_for_tunnel_url "$METRO_LOG")

METRO_HOST="${METRO_URL#https://}"

echo ""
echo "  API tunnel   : $API_URL"
echo "  Metro tunnel : $METRO_URL"
echo ""
echo "  Scan this QR in Expo Go (works on any network):"
echo ""
node -e "require('qrcode-terminal').generate('exps://$METRO_HOST', {small: true}, console.log)"
echo ""
echo "  Or enter manually in Expo Go: exps://$METRO_HOST"
echo ""

# ── start API ─────────────────────────────────────────────────────────────────

echo "Starting API on :4000..."
pnpm --filter @glitch/api dev &
API_PID=$!

# ── start Metro (no --tunnel, CF handles the public access) ───────────────────

echo "Starting Metro..."
EXPO_PUBLIC_API_URL="$API_URL" \
  REACT_NATIVE_PACKAGER_HOSTNAME="$METRO_HOST" \
  dotenv -e apps/mobile/../../.env -- \
  pnpm --filter @glitch/mobile exec expo start --host lan --go

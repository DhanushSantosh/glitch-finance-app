#!/usr/bin/env bash
# dev-local-tunnel.sh — local API + Cloudflare tunnel + Expo tunnel
#
# Usage: pnpm dev:local-tunnel
#
# Prerequisites:
#   - cloudflared installed: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
#   - Docker running (for Postgres + Redis)

set -euo pipefail

# ── helpers ──────────────────────────────────────────────────────────────────

cleanup() {
  echo ""
  echo "Shutting down..."
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "${CF_PID:-}" ]] && kill "$CF_PID" 2>/dev/null || true
  [[ -n "${TUNNEL_LOG:-}" ]] && rm -f "$TUNNEL_LOG"
}
trap cleanup EXIT INT TERM

# ── checks ────────────────────────────────────────────────────────────────────

if ! command -v cloudflared &>/dev/null; then
  echo "Error: cloudflared not found."
  echo "Install from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  exit 1
fi

# ── start services ────────────────────────────────────────────────────────────

echo "Starting Postgres + Redis..."
pnpm db:up
pnpm db:wait

echo "Starting API on :4000..."
pnpm --filter @glitch/api dev &
API_PID=$!

# Give the API a moment to bind
sleep 3

# ── cloudflare tunnel ─────────────────────────────────────────────────────────

TUNNEL_LOG=$(mktemp)
echo "Starting Cloudflare tunnel..."
cloudflared tunnel --url http://localhost:4000 2>"$TUNNEL_LOG" &
CF_PID=$!

echo "Waiting for tunnel URL..."
TUNNEL_URL=""
for _ in $(seq 1 30); do
  TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1 || true)
  [[ -n "$TUNNEL_URL" ]] && break
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "Error: timed out waiting for tunnel URL. Check cloudflared output:"
  cat "$TUNNEL_LOG"
  exit 1
fi

echo ""
echo "  Tunnel URL : $TUNNEL_URL"
echo "  API health : $TUNNEL_URL/api/v1/health"
echo ""

# ── expo ──────────────────────────────────────────────────────────────────────

echo "Starting Expo (tunnel mode)..."
EXPO_PUBLIC_API_URL="$TUNNEL_URL" pnpm --filter @glitch/mobile dev:tunnel

# API and CF processes are killed via the trap on exit

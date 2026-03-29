# Local Dev Setup

## Quick start

```bash
git clone <your-fork-or-repo-url>
cd glitch-finance-app
pnpm install
cp .env.example .env
pnpm db:up
pnpm --filter @glitch/api db:migrate
pnpm dev
```

OTP provider mode for local:
- Keep `OTP_PROVIDER=console` in the root `.env` to use debug OTP.
- Use `OTP_PROVIDER=resend` only when validating real email delivery with `RESEND_API_KEY`.
- Keep `DEBUG_OTP_EXPOSURE=true` only for local development. Shared environments should set it to `false`.

## Alternative startup

```bash
pnpm dev         # default phone workflow — Tailscale + Expo Go
pnpm dev:tailscale
pnpm dev:api
pnpm dev:android
pnpm dev:mobile  # Expo only
pnpm android:fast
```

## API connection

The mobile app reads `EXPO_PUBLIC_API_URL` from the root `.env`.

Default for local API:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

For Android emulator, use:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

For physical device testing on the same Wi-Fi, use your machine LAN IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000
```

Restart Expo after changing this value.

For physical device testing on any network, use Tailscale instead of editing `EXPO_PUBLIC_API_URL` manually:

1. connect both laptop and phone to the same Tailnet
2. run `pnpm dev`
3. scan the Expo QR in Expo Go

The script injects:
- `EXPO_PUBLIC_API_URL=http://<tailscale-ip>:4000`
- `REACT_NATIVE_PACKAGER_HOSTNAME=<tailscale-ip>`

## Quick diagnostics

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/status    # includes otpDelivery.provider/ready/requestTimeoutMs
curl http://localhost:4000/api/v1/bootstrap
curl http://localhost:4000/api/v1/metrics
```

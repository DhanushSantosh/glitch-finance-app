# Local Dev Setup

## Quick start

```bash
git clone <your-fork-or-repo-url>
cd glitch-finance-app
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
pnpm db:up
pnpm --filter @glitch/api db:migrate
pnpm dev:android
```

OTP provider mode for local:
- Keep `OTP_PROVIDER=console` in `apps/api/.env` to use debug OTP.
- Use `OTP_PROVIDER=resend` only when validating real email delivery with `RESEND_API_KEY`.

## Alternative startup

```bash
pnpm dev:api
pnpm android:fast
```

Other options:

```bash
pnpm dev         # API + mobile
pnpm dev:mobile  # Expo only
```

## API connection

The mobile app reads `EXPO_PUBLIC_API_URL` from `apps/mobile/.env`.

Default for local API:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

For Android emulator, use:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

For physical device testing, use your machine LAN IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000
```

Restart Expo after changing this value.

## Quick diagnostics

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/status    # includes otpDelivery.provider/ready/requestTimeoutMs
curl http://localhost:4000/api/v1/bootstrap
curl http://localhost:4000/api/v1/metrics
```

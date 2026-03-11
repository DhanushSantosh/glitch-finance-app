# Local Dev Setup - Sprint 1 (Auth + Transactions)

## Quick start

```bash
cd /home/dhanush/Projects/glitch-finance-app
pnpm install
pnpm db:up
pnpm --filter @glitch/api db:migrate
pnpm dev:android
```

## Alternative startup

```bash
pnpm dev:api
pnpm android:fast
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

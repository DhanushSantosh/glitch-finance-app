# Security and Privacy

## Authentication and Session

- Email OTP flow for sign-in and account recovery.
- OTP values are generated server-side and stored only as a hash (`OTP_HASH_SECRET`-keyed HMAC).
- Session token is issued to client and stored as hash in DB (`sessions.token_hash`).
- Logout revokes session by setting `revoked_at`.
- Active session count is capped per user (`AUTH_MAX_ACTIVE_SESSIONS`), automatically revoking oldest sessions when limit is exceeded.
- Dedicated recovery OTP alias routes are available for account recovery flows.
- Account deletion permanently removes the user and all cascaded owned records.

## Request Validation and Error Handling

- Zod validation enforced at all route input boundaries.
- Typed validation failure responses with stable error envelope (`code`, `message`, `details`).
- Unified error handler in `app.ts` prevents stack trace leakage to clients.

## Authorization and Data Isolation

- All transaction, budget, goal, and category routes enforce `user_id` ownership on reads and writes.
- Cross-user access attempts return `404 TRANSACTION_NOT_FOUND` (or equivalent), not `403`.
- Default categories (`user_id = null`) are protected: user CRUD operations are rejected.
- Cascade `ON DELETE` constraints in Postgres ensure data is removed atomically on account deletion.

## Rate Limiting

- `request-otp` and `verify-otp` routes are rate-limited by both email and IP.
- Redis is the primary rate-limit store; in-memory fallback is used if Redis is unavailable.
- Limits are configurable via environment variables: `AUTH_RATE_LIMIT_WINDOW_SECONDS`, `AUTH_RATE_LIMIT_MAX_REQUEST_OTP`, `AUTH_RATE_LIMIT_MAX_VERIFY_OTP`.

## SMS Guardrails (Critical Policy)

- SMS detection is disabled by default.
- No raw SMS content is ingested, parsed, or stored.
- Settings action records intent only via the consent endpoint.
- API bootstrap explicitly exposes the disabled default flag (`featureFlags.smsImportEnabledByDefault = false`).

## Auditability

Audit events are captured for all security and mutation actions via `AuditService`:

| Event | Trigger |
|---|---|
| `auth.login` | Successful OTP verification |
| `auth.logout` | Session revocation |
| `auth.account_deletion_requested` | Account delete action |
| `consent.intent` | SMS consent intent logged |
| `transaction.create` | Transaction created |
| `transaction.update` | Transaction updated |
| `transaction.delete` | Transaction deleted |
| `category.create` | Custom category created |
| `category.update` | Custom category updated |
| `category.delete` | Custom category deleted |

Each audit log entry stores `request_id` and `ip_address` for full request traceability.

## Sensitive Data Handling

- Never log raw OTP values to production logs.
- Never persist full SMS payload.
- Secrets (database credentials, OTP hash secret, email API keys) must be stored in environment variables or a managed secret store — never committed to source control.
- Use `OTP_PROVIDER=resend` in production to disable debug OTP console exposure.

## Production Hardening Checklist

1. Replace `OTP_PROVIDER=console` with a managed email provider (`resend`).
2. Set `OTP_HASH_SECRET` to a strong, unique value (use `pnpm secrets:otp` to generate).
3. Enforce TLS termination at edge/load balancer — never expose plain HTTP in production.
4. Configure all secrets via a managed secret store, not `.env` files.
5. Restrict database network ingress to app-tier only.
6. Enable automated database backups with point-in-time recovery before first production release.
7. Scrape `/api/v1/metrics` and configure alerts for error rate and latency SLOs.
8. Add request-level abuse monitoring on auth endpoints.

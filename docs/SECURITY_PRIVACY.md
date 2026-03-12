# Security and Privacy

## Sprint 1.1 Security Controls

### Authentication and Session

- Email OTP flow for sign-in.
- OTP values are generated server-side and stored only as hash.
- Session token is issued to client and stored as hash in DB.
- Logout revokes session by setting `revoked_at`.

### Request Validation and Error Handling

- Zod validation at all route boundaries.
- Typed validation failure responses with stable error envelope.
- Unified error handler prevents leaking stack traces to clients.

### Authorization and Data Isolation

- Transaction routes enforce `user_id` ownership on reads and writes.
- Cross-user transaction update/delete attempts return not found behavior.

### Rate Limiting

- Auth routes are rate-limited by email and IP.
- Redis-backed limiter with in-memory fallback for local reliability.

## SMS Guardrails (Critical Policy)

- SMS detection is disabled by default.
- Sprint 1.1 does not ingest, parse, or store raw SMS content.
- Settings action records intent only via consent endpoint.
- API bootstrap explicitly exposes disabled default flag.

## Auditability

Audit events are captured for:

- Login
- Logout
- Consent intent actions
- Transaction create/update/delete

Audit log stores request id and source IP for traceability.

## Sensitive Data Handling

- Never log raw OTP to production logs.
- Never persist full SMS payload in Sprint 1.1.
- Keep secrets in environment variables.

## Production Hardening Checklist

1. Replace development OTP provider with managed email provider.
2. Rotate `OTP_HASH_SECRET` to a strong, unique secret.
3. Enforce TLS termination at edge/load balancer.
4. Configure secret manager for environment variables.
5. Add request-level abuse monitoring and alerting.

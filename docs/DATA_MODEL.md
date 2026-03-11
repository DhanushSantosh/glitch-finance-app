# Data Model

Database: PostgreSQL 16+

ORM: Drizzle (`apps/api/src/db/schema.ts`)

## Enums

- `transaction_direction`: `debit`, `credit`, `transfer`
- `transaction_source`: `manual`, `sms_import`, `statement_import`

## Tables

### `users`

- `id` (uuid, pk)
- `email` (unique)
- timestamps

### `sessions`

- `id` (uuid, pk)
- `user_id` -> `users.id`
- `token_hash` (unique)
- `expires_at`, `revoked_at`, `created_at`

### `auth_otps`

- `id` (uuid, pk)
- `email`
- `code_hash`
- `expires_at`
- `attempts`, `max_attempts`
- `request_ip`, `used_at`, `created_at`

### `categories`

- `id` (uuid, pk)
- `user_id` nullable -> `users.id`
- `name`
- `direction`
- `created_at`

`user_id = null` represents globally seeded default categories.

### `transactions`

- `id` (uuid, pk)
- `user_id` -> `users.id`
- `category_id` nullable -> `categories.id`
- `direction`, `source`
- `amount` (numeric 14,2)
- `currency` (3-char)
- `counterparty`, `note`
- `occurred_at`, `created_at`, `updated_at`

### `consents`

- `id` (uuid, pk)
- `user_id` -> `users.id`
- `consent_key`
- `enabled`
- `legal_text_version`
- `captured_at`

Unique: `(user_id, consent_key)`

### `audit_logs`

- `id` (uuid, pk)
- `user_id` nullable -> `users.id`
- `action`, `entity_type`, `entity_id`
- `metadata` (jsonb)
- `request_id`, `ip_address`, `created_at`

## Migration Workflow

From repo root:

```bash
pnpm --filter @glitch/api db:generate
pnpm --filter @glitch/api db:migrate
```

Generated migration artifacts live in `apps/api/drizzle`.

## Seeding

Default categories are ensured during API startup by `ensureDefaultCategories`.

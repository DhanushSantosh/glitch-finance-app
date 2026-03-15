# Agent Collaboration — Glitch Finance App

**All agents read this file before starting any work.**

Full protocol: [`.claude/AGENTS.md`](./.claude/AGENTS.md)
Shared memory: [`.agents/memory/`](./.agents/memory/)

---

## Shared Memory (Read First)

| File | Read when |
|---|---|
| [`.agents/memory/handoff.md`](./.agents/memory/handoff.md) | Every session start — where we left off |
| [`.agents/memory/state.md`](./.agents/memory/state.md) | Understanding what's built and what's pending |
| [`.agents/memory/conventions.md`](./.agents/memory/conventions.md) | Before writing any code |
| [`.agents/memory/decisions.md`](./.agents/memory/decisions.md) | Before making architectural choices |

---

## The Three Agents

| Agent | Role |
|---|---|
| **Claude** (Lead) | Orchestration, architecture, all file writes, git commits |
| **Codex** | Backend scaffolding, test generation, algorithms, Drizzle/Zod/Fastify code |
| **Gemini** | UI/UX review, full codebase analysis, design consistency, docs |

**Decision authority:** Backend correctness → Codex. Frontend design → Gemini. Architecture + final write → Claude.

---

## Stack (Quick Reference)

```
Monorepo:   pnpm workspaces — apps/api + apps/mobile
API:        Fastify v5, Drizzle ORM, PostgreSQL 16, Redis (optional)
Mobile:     Expo 55, React Native 0.83, React 19
Auth:       Email OTP → session token
Theme:      Glitch Midnight — #000000 bg, #D4FF00 accent
Tests:      Vitest — 171 tests, all green
CI:         GitHub Actions (lint → typecheck → db:check → test)
```

---

## Key Paths

```
apps/api/src/
  app.ts              — Fastify app setup
  context.ts          — DB, Redis, services wiring
  env.ts              — All env var definitions
  db/schema.ts        — Drizzle schema (source of truth)
  modules/            — Feature modules (auth, transactions, budgets, etc.)
  integration/        — Integration tests

apps/mobile/
  App.tsx             — Root component, all state
  src/api/client.ts   — API client
  src/screens/        — All screens (presentational)
  src/components/ui/  — UI primitives
  src/theme/          — Design tokens
```

---

## Memory Update Protocol

At session end, update `.agents/memory/handoff.md` with what was done.
Update other memory files when state, decisions, or conventions change.
Every agent is responsible for keeping memory current.

---

## Rules

1. **No file writes except Claude** — Codex and Gemini propose, Claude implements
2. **No commits except Claude**
3. **Read memory before starting** — never assume context from a previous session
4. **Update memory before ending** — next agent depends on it
5. **Tests must stay green** — run `pnpm --filter @glitch/api test` after API changes

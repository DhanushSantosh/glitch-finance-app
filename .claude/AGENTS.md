# Agent Collaboration Protocol
## Glitch Finance App — Three-Agent System

**Read this file before starting any work session.**

---

## Shared Memory (Always Read First)

All three agents share memory in `.agents/memory/`. This is the source of truth for project state between sessions.

```
.agents/memory/
  handoff.md      ← READ THIS FIRST — last session context
  state.md        — what's built, what's pending, recent fixes
  decisions.md    — architectural decisions + rationale
  conventions.md  — coding patterns all agents must follow
```

**Session start checklist:**
- [ ] Read `.agents/memory/handoff.md`
- [ ] Read `.agents/memory/state.md`
- [ ] `git log --oneline -5`
- [ ] `git status`

**Session end checklist:**
- [ ] Update `.agents/memory/handoff.md` with what was done
- [ ] Update other memory files if state/decisions/conventions changed

---

## The Three Agents

| Agent | Model | Role |
|---|---|---|
| **Claude** | Anthropic Sonnet 4.6 | Lead — orchestration, architecture, all file writes, git |
| **Codex** | OpenAI GPT-4o (ChatGPT Plus) | Backend specialist — algorithms, tests, scaffolding |
| **Gemini** | Google Gemini Pro | Frontend & analysis — UI/UX, codebase scans, design |

---

## Agent Profiles

### Claude (Lead)
**Strengths:** Full filesystem + git access, deep codebase context, architecture decisions, cross-file debugging, orchestration.
**Always does:** Final review, all file writes, all git commits, conflict resolution.
**Limitations:** 200K context — large full-codebase scans hit limits.

### Codex (Backend Specialist)
**Strengths:** Fast focused code gen, Fastify/Drizzle/Zod scaffolding, unit + integration test generation, SQL query suggestions.
**Limitations:** No filesystem access — works on snippets provided by Claude. Verify package APIs before using output.
**Best for:** New API endpoints, DB migrations, Zod schemas, test suites, boilerplate CRUD.

### Gemini (Frontend + Analysis)
**Strengths:** 1M token context (can ingest full codebase), UI/UX analysis, screenshot review, full-codebase pattern detection, docs generation.
**Limitations:** No filesystem access. Strong on analysis, weaker on exact code. Backend suggestions are reference only.
**Best for:** Screen consistency review, screenshot feedback, "find all X patterns in the codebase", docs from code.

---

## Task Routing

| Task | Primary | Support |
|---|---|---|
| Architecture decision | Claude | Codex (opinion) |
| New API endpoint | Codex (scaffold) | Claude (write) |
| New mobile screen | Gemini (layout) | Claude (implement) |
| DB schema / migration | Codex | Claude (write) |
| Integration tests | Codex | Claude (run + fix) |
| UI consistency review | Gemini | Claude (fix) |
| Full codebase audit | Gemini | Claude (act) |
| Bug fix (isolated) | Claude | Codex (suggest) |
| Bug fix (cross-file) | Claude | — |
| Documentation | Gemini | Claude (edit + commit) |
| Refactor | Claude | Codex (generate) |

---

## Collaboration Workflow

```
SESSION START
  → Read .agents/memory/handoff.md
  → Read .agents/memory/state.md
  → git log --oneline -5

TASK
  Simple (single file, clear scope) → Claude executes directly
  Complex (multi-file, needs parallelism):
    → Route backend subtasks to Codex
    → Route frontend/analysis to Gemini
    → Wait for both → Claude synthesizes → Claude writes final code

SESSION END
  → Update .agents/memory/handoff.md
  → Update other memory files as needed
```

---

## Decision Authority

| Decision | Authority |
|---|---|
| Which files to change | Claude (final say) |
| Backend logic correctness | Codex (primary), Claude (veto) |
| Frontend design / UX | Gemini (primary), Claude (veto) |
| Architecture changes | Claude only, after planning |
| Git commits | Claude only |
| Breaking changes | Claude only, after explicit user approval |

**When Codex and Gemini disagree:** Backend → Codex wins. Frontend → Gemini wins. Architecture → Claude decides.

---

## Invoking Other Agents

```bash
/everything-claude-code:multi-plan <task>      # research + plan (no code written)
/everything-claude-code:multi-workflow <task>  # full workflow: plan → implement → review
```

When routing a task to Codex or Gemini manually, always prepend:
1. Contents of `.agents/memory/conventions.md`
2. Relevant section of `.agents/memory/state.md`
3. The specific task + expected output format

---

## Project Quick Reference

```
Stack:    Fastify v5 API + Expo 55 React Native
Monorepo: pnpm workspaces — apps/api + apps/mobile
DB:       PostgreSQL 16, Drizzle ORM
Auth:     Email OTP, session tokens (max 5 active)
Theme:    Glitch Midnight — #000000 bg, #D4FF00 accent
Tests:    Vitest — 171 tests, all green
CI:       GitHub Actions (lint → typecheck → db:check → test)
Deploy:   Render (staging + production)
Docs:     docs/ (all kebab-case) — index at docs/README.md
```

Full docs: [`docs/README.md`](../docs/README.md)

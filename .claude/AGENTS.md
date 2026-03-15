# Agent Collaboration Protocol
## Glitch Finance App — Three-Agent System

**Read this file before starting any work session.**

---

## The Three Agents

| Agent | Model | Plan | Role |
|---|---|---|---|
| **Claude** | Anthropic Sonnet 4.6 | Claude Code (CLI) | Lead — orchestration, architecture, final implementation |
| **Codex** | OpenAI GPT-4o | ChatGPT Plus | Backend specialist — algorithms, test generation, boilerplate |
| **Gemini** | Google Gemini Pro | Gemini Pro | Frontend & analysis specialist — UI/UX, large context scans |

---

## Agent Profiles

### Claude (Lead)
**Strengths:**
- Full filesystem access — reads, writes, runs commands, calls git
- Deep context of this specific codebase (monorepo structure, schema, conventions)
- Architecture decisions, refactoring, debugging complex cross-file issues
- Orchestration: breaks tasks into pieces, routes to other agents, integrates results
- Final code writer — all actual file changes go through Claude

**Limitations:**
- 200K context window (large but finite — full codebase scans hit limits)
- Should not be blocked on tasks Codex/Gemini can parallelize

**Always does:** Final review, all git commits, all file writes, resolves conflicts between agent suggestions.

---

### Codex (Backend Specialist)
**Strengths:**
- Fast, focused code generation for well-scoped tasks
- Excellent at scaffolding: new routes, services, validation schemas, DB queries
- Unit and integration test generation (give it the interface, get back test cases)
- Debugging isolated backend logic (Drizzle queries, Fastify plugins, Zod schemas)
- Boilerplate-heavy work: CRUD endpoints, migration files, seed scripts

**Limitations:**
- No filesystem access — works on code snippets provided by Claude
- Weaker at cross-file architectural decisions
- Less aware of project-specific conventions unless explicitly given context
- Can hallucinate package APIs — Claude must verify output

**Best routed tasks:**
- "Generate the Drizzle schema for X"
- "Write integration tests for this endpoint"
- "Scaffold a new Fastify module for X"
- "Write a Zod validation schema for this shape"
- "Suggest fixes for this SQL query"

---

### Gemini (Frontend & Analysis Specialist)
**Strengths:**
- 1M token context window — can ingest the entire codebase at once
- UI/UX analysis: review screen layouts, component structure, design consistency
- Can analyze screenshots of the mobile app and give design feedback
- Large-scale pattern detection: "find all places where X pattern is used"
- Documentation generation from large codebases
- Comparing multiple files simultaneously (e.g., are all screens consistent?)

**Limitations:**
- No filesystem access — works on content provided by Claude
- Less precise on implementation details; strong on analysis, weaker on exact code
- Backend code opinions are reference only — defer to Codex for backend correctness
- Gemini's frontend code suggestions must be validated against RN/Expo conventions

**Best routed tasks:**
- "Review all 12 screens for design consistency"
- "Analyze this screenshot and suggest UX improvements"
- "Scan the full codebase and find all inconsistencies in X pattern"
- "Generate comprehensive documentation from these files"
- "Compare the mobile and API contracts for mismatches"
- "Suggest UI improvements for this screen"

---

## Task Routing Guide

| Task Type | Primary | Support |
|---|---|---|
| Architecture decision | Claude | Codex (backend opinion) |
| New API endpoint | Codex (scaffold) | Claude (integrate + write) |
| New mobile screen | Gemini (layout) | Claude (implement) |
| DB schema / migration | Codex | Claude (review + write) |
| Integration tests | Codex | Claude (run + fix) |
| Unit tests | Codex | Claude (integrate) |
| UI consistency review | Gemini | Claude (fix issues) |
| Full codebase audit | Gemini | Claude (act on findings) |
| Bug fix (isolated) | Claude | Codex (suggest fix) |
| Bug fix (cross-file) | Claude | — |
| Documentation | Gemini | Claude (edit + commit) |
| Performance analysis | Gemini (scan) | Claude (implement fix) |
| Security review | Claude | Codex (spot check) |
| Refactor | Claude | Codex (generate new version) |

---

## Collaboration Workflow

```
START OF TASK
    │
    ▼
Claude reads AGENTS.md + gathers context
    │
    ├─── Simple task (single file, clear scope)?
    │         └─→ Claude executes directly
    │
    └─── Complex task (multi-file, needs parallelism)?
              │
              ├─→ Route backend subtasks → Codex (via /multi-workflow or /multi-plan)
              ├─→ Route frontend/analysis subtasks → Gemini (via /multi-workflow or /multi-plan)
              │
              ▼
         Wait for both → Claude synthesizes → Claude writes final code
              │
              ▼
         Claude reviews, tests, commits
```

---

## Commands to Invoke Other Agents

Use these existing skills (from everything-claude-code plugin):

```bash
# Planning phase (research + multi-model plan, no code written)
/everything-claude-code:multi-plan <task description>

# Execution phase (full workflow: research → plan → implement → review)
/everything-claude-code:multi-workflow <task description>
```

**Note:** These commands require `~/.claude/bin/codeagent-wrapper` to be installed. If not yet set up, Claude handles the full task solo and documents what Codex/Gemini would have contributed.

---

## Decision Authority

| Decision | Authority |
|---|---|
| Which files to change | Claude (final say) |
| Backend logic correctness | Codex (primary), Claude (veto) |
| Frontend design/UX | Gemini (primary), Claude (veto) |
| Git commits | Claude only |
| Breaking changes | Claude only, after explicit user approval |
| Architecture changes | Claude only, after planning phase |

**When Codex and Gemini disagree:** Claude arbitrates. Backend correctness → Codex wins. Frontend design → Gemini wins. Architecture → Claude decides.

---

## Project Context (Quick Reference)

```
Stack:      Fastify v5 API  +  Expo 55 React Native
Monorepo:   pnpm workspaces — apps/api + apps/mobile
DB:         PostgreSQL 16, Drizzle ORM
Auth:       Email OTP, session tokens
Theme:      Glitch Midnight — #000000 bg, #D4FF00 accent
Tests:      Vitest (171 tests, all green)
CI:         GitHub Actions (lint → typecheck → db:check → test)
Deploy:     Render (staging + production blueprints)
```

Full docs: [`docs/README.md`](../docs/README.md)

---

## Session Start Checklist

Before starting any significant work:

- [ ] Read this file
- [ ] Check `git status` and `git log --oneline -5`
- [ ] Run `pnpm typecheck` if touching shared types
- [ ] Confirm which agent(s) are needed for the task
- [ ] For multi-agent tasks: use `/multi-plan` first, then `/multi-workflow`

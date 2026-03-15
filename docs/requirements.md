# Software Requirements Specification (SRS)
## Project: Glitch - AI-Powered Expense Tracker

- **Version**: 1.0 (Draft)
- **Date**: March 10, 2026
- **Prepared by**: Product + Engineering Working Draft (Co-working baseline)
- **Status**: Planning approved for pre-development stage

## 1. Purpose
This SRS defines product requirements, system behavior, architecture constraints, and delivery criteria for the Glitch mobile application. The goal is to de-risk implementation before coding starts and align product, engineering, and compliance decisions.

## 2. Product Vision
Build a cross-platform (iOS + Android) personal finance tracker focused on UPI-era transaction visibility, with low-friction ingestion, user-controlled privacy, and scalable architecture ready for future AI insights.

## 3. Product Goals
1. Help users track income and expenses with minimal manual effort.
2. Provide trustworthy transaction history and spending summaries.
3. Maintain privacy by default and explicit user consent for sensitive features.
4. Support reliable scaling from college MVP to production-grade user load.
5. Create an architecture that can safely add AI-driven insights later.

## 4. In-Scope (MVP)
1. User onboarding and authentication.
2. Transaction management:
   - Manual add/edit/delete.
   - Android opt-in SMS-based extraction with strict guardrails.
   - Import fallback (CSV/PDF statement parsing as phase-ready extension).
3. Auto-categorization (rule-based baseline).
4. Budgets and savings goals.
5. Reports dashboard (daily/weekly/monthly trends).
6. Cross-device sync and encrypted cloud backup.
7. Free and Pro plan gating.
8. Core notification reminders (budget limit, goal status).

## 5. Out of Scope (for MVP)
1. Financial advice or investment recommendations.
2. Full autonomous AI planner.
3. Direct banking API integrations requiring formal aggregator partnerships.
4. Business accounting features (GST invoicing, payroll, ledgers).
5. Web app client (mobile-only for MVP, admin internal tools only).

## 6. Key Stakeholders
1. End users: college students, UPI-heavy users, small business owners.
2. Product owner team: defines roadmap and monetization.
3. Engineering team: mobile, backend, infra, QA.
4. Compliance and security reviewers: data and permission governance.

## 7. User Personas
1. **Student spender**: many micro-transactions; needs quick monthly visibility.
2. **Young professional**: wants budget discipline and trend reports.
3. **Small merchant**: tracks mixed cash/UPI flow with simple summaries.

## 8. Functional Requirements

### 8.1 Authentication and Account
- **FR-001**: User shall sign up with email or phone OTP.
- **FR-002**: User shall log in securely with session continuity across devices.
- **FR-003**: User shall reset account access using verified recovery method.
- **FR-004**: User shall delete account and associated cloud data from settings.

### 8.2 Transaction Core
- **FR-010**: User shall create, edit, delete manual transactions.
- **FR-011**: User shall mark transaction type (`debit`, `credit`, `transfer`).
- **FR-012**: User shall assign or edit category and notes.
- **FR-013**: User shall view transaction list with filters by date, amount, type, category.

### 8.3 SMS Detection (Android, Opt-In)
- **FR-020**: SMS detection shall be **disabled by default** for all new users.
- **FR-021**: System shall request explicit consent before enabling SMS detection.
- **FR-022**: System shall present transparent disclosure of fields extracted and purpose.
- **FR-023**: System shall extract only minimal fields:
  - amount
  - debit/credit direction
  - counterparty or merchant token (if present)
  - transaction date/time
  - reference ID (if present)
- **FR-024**: System shall not store full SMS body in cloud by default.
- **FR-025**: System shall run extraction only on explicit user trigger in MVP (`Scan Now`).
- **FR-026**: User shall disable SMS detection anytime and revoke app permission.
- **FR-027**: User shall delete SMS-derived imported transactions separately.
- **FR-028**: iOS shall not depend on inbox SMS reading; equivalent data entry/import paths must exist.

### 8.4 Categorization and Rules
- **FR-030**: System shall auto-categorize transactions using deterministic rules.
- **FR-031**: User corrections shall update future categorization rules.
- **FR-032**: User shall create custom categories.

### 8.5 Budgets, Goals, Reports
- **FR-040**: User shall define monthly category budgets.
- **FR-041**: System shall track consumed budget and remaining balance.
- **FR-042**: User shall create savings goals with target amount/date.
- **FR-043**: Dashboard shall show spend trend, top categories, and net flow.
- **FR-044**: Reports shall support export to CSV/PDF.

### 8.6 Net Worth and Portfolio (MVP-lite)
- **FR-050**: User shall track assets/liabilities manually.
- **FR-051**: User shall view net-worth trend over time.
- **FR-052**: Optional stock/mutual fund sync remains post-MVP unless approved.

### 8.7 Sync, Backup, and Plans
- **FR-060**: User data shall sync across signed-in devices.
- **FR-061**: System shall maintain encrypted cloud backup.
- **FR-062**: Free tier limits and Pro tier entitlements shall be enforced server-side.

## 9. Non-Functional Requirements

### 9.1 Performance and Scalability
- **NFR-001**: API p95 latency for core reads/writes shall be under 300 ms at baseline load.
- **NFR-002**: System shall support 100k MAU scale target without major architecture rewrite.
- **NFR-003**: Asynchronous jobs (parsing/report generation) shall be queue-based and horizontally scalable.

### 9.2 Availability and Reliability
- **NFR-010**: Production uptime target: 99.9% monthly for API services.
- **NFR-011**: Daily automated backup and disaster recovery runbook shall exist.
- **NFR-012**: Critical data mutations shall be idempotent and auditable.

### 9.3 Security and Privacy
- **NFR-020**: Data in transit shall use TLS 1.2+.
- **NFR-021**: Sensitive user data at rest shall be encrypted.
- **NFR-022**: Principle of least privilege shall be applied across services.
- **NFR-023**: No raw OTP content or irrelevant message content shall be persisted.
- **NFR-024**: Consent events and permission changes shall be audit-logged.

### 9.4 Maintainability and Observability
- **NFR-030**: Codebase shall use modular architecture and strict TypeScript typing.
- **NFR-031**: CI must block merges on lint, type-check, and test failures.
- **NFR-032**: Logs, traces, and metrics shall be centralized with alerting on error budgets.

## 10. Policy and Platform Constraints
1. Android SMS permission usage is compliance-sensitive and subject to store review.
2. iOS does not provide equivalent full inbox access pattern for this use case.
3. Product must stay fully usable without SMS detection enabled.
4. Data minimization and user consent are mandatory design principles.

## 11. Recommended Technical Architecture

### 11.1 Mobile
1. React Native + Expo + TypeScript.
2. State/data: TanStack Query + local SQLite cache.
3. Secure local storage for tokens/secrets.
4. Feature flags for gradual rollout of sensitive modules.

### 11.2 Backend
1. NestJS (Fastify) modular monolith for MVP.
2. PostgreSQL as system of record.
3. Redis for cache/rate-limit/queues.
4. Worker service for SMS parsing, categorization, report generation.

### 11.3 Infra
1. Managed container runtime (Cloud Run/Fargate equivalent).
2. Managed Postgres and managed Redis.
3. Object storage for exports and optional documents.
4. CI/CD with dev, staging, production environments.

### 11.4 Observability and Ops
1. Error tracking + APM + structured logs.
2. SLO dashboard and incident response runbook.
3. Security monitoring and anomaly alerts.

## 12. Data Model (High-Level)
1. `users`
2. `devices`
3. `consents` (permission + legal text version + timestamps)
4. `transactions`
5. `transaction_sources` (`manual`, `sms_import`, `statement_import`)
6. `categories`
7. `budget_plans`
8. `savings_goals`
9. `assets`, `liabilities`
10. `subscriptions`
11. `audit_logs`

## 13. API Surface (MVP)
1. `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
2. `GET/POST/PATCH/DELETE /transactions`
3. `POST /imports/sms/scan` (Android client-triggered)
4. `POST /imports/statements` (phase-ready)
5. `GET/POST/PATCH /budgets`
6. `GET/POST/PATCH /goals`
7. `GET /reports/summary`
8. `GET/POST /networth`
9. `GET /subscription/status`
10. `POST /consents`

## 14. AI Layer Readiness (Deferred but Planned)
1. AI inference will run as separate service behind queue/event boundary.
2. Model outputs shall be explainable and user-reviewable before acceptance.
3. No autonomous financial advice in MVP.
4. Human override and feedback loop required for future recommendation system.

## 15. Testing Strategy
1. Unit tests for parsing, categorization, entitlement, and calculations.
2. Integration tests for API/database boundaries.
3. E2E tests for onboarding, transaction flows, budget alerts.
4. Security tests for auth/session/token misuse and permission abuse.
5. Performance tests for report generation and list retrieval under load.

## 16. Release Plan (Pre-Development to Launch)
1. **Phase A: Planning and Validation (Current)**
   - Freeze PRD + SRS + risk register.
   - Validate policy interpretation and compliance checklist.
2. **Phase B: MVP Build**
   - Core tracking + budgets + reports + manual data path.
3. **Phase C: Controlled SMS Rollout (Android)**
   - Internal QA, limited beta, policy review artifacts.
4. **Phase D: Production Launch**
   - Regional rollout, observability-backed scaling.
5. **Phase E: AI Insight Layer**
   - Introduce optional AI summaries with strict guardrails.

## 17. Risk Register
1. **App-store compliance risk (high)**: SMS feature rejection or delays.
   - Mitigation: Android-only opt-in, strict minimization, non-SMS fallback parity.
2. **Privacy trust risk (high)**: user concern about message access.
   - Mitigation: explicit disclosure, local parsing preference, transparent controls.
3. **Data quality risk (medium)**: parsing errors from bank format variance.
   - Mitigation: parser confidence scoring + user review queue.
4. **Scale/cost risk (medium)**: infra overhead as users grow.
   - Mitigation: managed services + queue-first design + cost monitoring.

## 18. Acceptance Criteria for MVP Sign-Off
1. Core app value works without SMS feature.
2. SMS detection remains off by default and can be toggled with explicit consent.
3. Only approved transaction fields are extracted for SMS imports.
4. Budget and report modules are stable and accurate for at least 95% tested cases.
5. CI quality gates are active with no bypass policy.
6. Security and backup controls pass internal checklist.

## 19. Open Decisions (Need Team Confirmation)
1. Final authentication method priority: email+OTP vs phone+OTP vs social login.
2. Cloud provider selection for backend hosting.
3. Free tier daily limits and ad policy final numbers.
4. Regional launch strategy and legal terms text.
5. Data retention period for logs and import metadata.

## 20. Immediate Next Planning Artifacts
1. Product Requirements Document (PRD) mapped to this SRS IDs.
2. Technical Architecture Decision Record (ADR) set.
3. Security and compliance checklist.
4. Database schema draft (ERD).
5. API contract draft (OpenAPI).

---
This SRS is intentionally implementation-ready but still pre-code. Any coding begins only after Section 19 decisions are signed off.

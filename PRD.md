```markdown
# Prompt69 PRD

## 1) Product Summary

PromptRefine is a personal web workspace to create, version, test, and refine prompts for OpenAI coding models.

Target user: solo developer (me).

Core value proposition:

- Fast edit → run → compare loop
- Versioned prompt history
- Simple, low-maintenance architecture

---

## 2) Release Scope

### v1 (Must Ship)

1. Simple authentication (single user)
2. Prompt CRUD + optional tags
3. Immutable prompt versions + restore
4. Manual test runs (can start sync first, async later)
5. Run history with output + token usage

// 6. Workspace-level model allowlist enforcement (seeded, no admin UI)
// 7. Basic quotas (requests/day + budget cap checks)

### v1.1 (Optional)

1. Basic A/B compare view
2. Better run filtering/search

// 3. Budget alert notifications (email)
// 4. Admin UI for model allowlist and rubric management

### Future / Parked

// - Auto-refine suggestions
// - Auto-categorization
// - Semantic search (pgvector)
// - Advanced analytics dashboards

v1 acceptance criteria:

- I can create a prompt, save a new immutable version, run it, and view output + usage history.
- I can restore an old version and rerun quickly.

---

## 3) Architecture

Pattern: simple modular monolith

- Single Next.js app (UI + API)
- PostgreSQL database
- Optional worker if runs become long

### Components

- Frontend: Next.js + Tailwind + shadcn/ui
- API: Next.js Route Handlers (REST)
- DB: PostgreSQL + Drizzle
- OpenAI calls: direct server call first; move to queue only if needed

// - Jobs: pg-boss worker for model execution/evaluation
// - External: Resend, Sentry, PostHog, S3/R2

---

## 4) Data Model (Personal Simplified)

All IDs are UUIDs. Timestamps use `TIMESTAMPTZ DEFAULT NOW()`.

### User

- id, email, name, created_at

### Prompt

- id, title, type, tags, current_version_id, created_at, updated_at

### PromptVersion (immutable)

- id, prompt_id, version_number, content, notes, created_at
- Unique: (prompt_id, version_number)

### TestRun

- id, prompt_id, prompt_version_id, status, model, params, input_variables, output, usage, error, created_at, updated_at

// ### Workspace
// - id, name, plan, created_at, updated_at
//
// ### Membership
// - id, user_id, workspace_id, role
//
// ### RateLimitQuota
// - id, workspace_id, ...
//
// ### AuditLog
// - id, workspace_id, actor_user_id, action, ...

### Indexes

- prompt_versions(prompt_id, version_number)
- test_runs(prompt_id, created_at DESC)
- Optional trigram index on prompt title

---

## 5) API Contract

Keep responses simple and consistent:

```json
{ "data": {}, "error": null }
{ "data": null, "error": { "code": "INVALID_INPUT", "message": "..." } }
```

---

## 6) API Endpoints (v1)

### Auth

- `GET /api/auth/session`
- `POST /api/auth/signin`
- `POST /api/auth/signout`

### Prompts

- `GET /api/prompts`
- `POST /api/prompts`
- `GET /api/prompts/:id`
- `PATCH /api/prompts/:id`
- `DELETE /api/prompts/:id`

### Versions

- `GET /api/prompts/:id/versions`
- `POST /api/prompts/:id/versions`
- `POST /api/prompts/:id/restore`

### Test Runs

- `POST /api/test-runs`
- `GET /api/test-runs?promptId=...`
- `GET /api/test-runs/:id`

// ### Workspaces / Folders / Models / Admin — deferred for personal build

---

## 7) Run Lifecycle

`TestRun.status`: `queued → running → succeeded | failed`

- Start with minimal retries for transient failures.
- Add idempotency key only if duplicate submission becomes an issue.

// - timed_out, canceled, dead-letter queues, and advanced retry classes can be added later.

---

## 8) Security & Auth

- Single-user auth via Auth.js (or even local auth in dev).
- Protect all app routes.
- Keep API keys server-side only.

// - Multi-tenant RLS and role matrix (owner/admin/editor/viewer) deferred.

---

## 9) Frontend Pages (v1)

- `/login`
- `/app` (prompt list)
- `/app/prompts/:promptId` (editor + versions + run panel)

// - Marketing site, folders page, workspace settings, admin screens deferred.

---

## 10) Infra & Deployment

- Run locally first.
- Deploy monolith when stable (Vercel or Railway).
- Managed Postgres (Neon/Supabase).

// - Separate worker deployment
// - S3/R2 artifact storage
// - Full CI pipeline with staging soak and migration gates

---

## 11) Success Metrics (Personal)

- Prompt edit → run feedback time feels fast (< 10s for normal prompts)
- Runs are reproducible by version
- No data loss on prompt/version history

// - Team KPIs (WAW), uptime SLOs, error budgets, and enterprise launch gates deferred.

---

## 12) Nice-to-have Later

- A/B compare UI
- Basic prompt templates
- Export prompt + run history as JSON/Markdown

// - Analytics/event pipelines (PostHog)
// - Advanced monitoring (Sentry alerts)
// - Email workflows (Resend)

---

## 13) Final Hardening Gate

- Use `FINAL_HARDENING_PROMPT.md` as the required end-of-implementation production hardening checklist and release-readiness report template.
```

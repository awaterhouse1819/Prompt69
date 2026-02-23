# PromptRefine v1 — Active Plan (Updated 2026-02-23)

## Goal
Ship v1: prompt CRUD, immutable versions, test runs against OpenAI, and run history.

## Current Snapshot
- v1 scope from `PRD.md` is implemented: auth, prompt CRUD, immutable versions/restore, manual test runs, and run history.
- Hardening milestones P0/P1/P2 are complete in code: correlation IDs, structured logging, API error mapping, session/cookie hardening, runbooks, tests, seed, and typed repositories.
- Runtime workflow is documented and automated with `scripts/check-runtime.mjs` and `scripts/setup.mjs`.
- Remaining closeout work is operational/documentary: final local DB-backed validation pass and final release-readiness report table refresh.

## Milestone 0: Environment Unblock (Do First)
- [x] `.env.local` exists and baseline keys are set (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD`)
- [x] Switch shell to Node `20.19.0` (`nvm use`) and confirm `node -v` matches
- [x] Re-run `npm run build` under Node 20 (pass)
- [x] Fix lint pipeline for Next.js 16 (migrated to ESLint flat config) and re-run lint (pass)
- [x] Confirm local PostgreSQL auth/user configuration for `DATABASE_URL`
- [x] Run `npm run db:generate` to create `drizzle/` migrations
- [x] Run `npm run db:migrate` and verify tables are created
- [x] Commit infrastructure baseline changes (`drizzle/*`, `eslint.config.mjs`, `package.json`, `package-lock.json`, plan/docs deltas)
- [x] Add runtime preflight guidance so contributors use `.nvmrc` Node version before checks (`scripts/check-runtime.mjs` + npm pre* hooks + README)
- [x] Add one-step `npm run setup` for runtime precheck + env sanity + DB migrate (`scripts/setup.mjs`)

## Milestone 1: Prompt CRUD (API + App List Page)
- [x] Implement `GET /api/prompts` (order by `updated_at` desc)
- [x] Implement `POST /api/prompts` (title, type, tags)
- [x] Implement `PATCH /api/prompts/[id]` (title/tags)
- [x] Implement `DELETE /api/prompts/[id]`
- [x] Update `src/app/app/page.tsx` to render prompt list + create form

## Milestone 2: Prompt Versions (Editor + History)
- [x] Implement `GET /api/prompts/[id]` (prompt + current version)
- [x] Implement `GET /api/prompts/[id]/versions`
- [x] Implement `POST /api/prompts/[id]/versions` (immutable save, increment version)
- [x] Implement `POST /api/prompts/[id]/restore` (set `current_version_id`)
- [x] Build `src/app/app/prompts/[id]/page.tsx` editor (content + version history)

## Milestone 3: Test Runs (OpenAI Integration)
- [x] Install `openai` package
- [x] Add `OPENAI_API_KEY` to `src/env.ts`, `.env.example`, and `.env.local`
- [x] Implement `POST /api/test-runs` (invoke OpenAI, persist output + usage + status)
- [x] Implement `GET /api/test-runs?promptId=...` (newest first)
- [x] Add run UI on editor page (model selector + run button + history panel)

## Milestone 4: Hardening + Quality Gates (from docs/FINAL_HARDENING_PROMPT.md)
P0 (release-blocking):
- [x] Add backup/restore + incident recovery quick-step runbook docs
- [x] Add request correlation ID propagation (`src/proxy.ts` + route handlers + response headers)
- [x] Add structured logger with sensitive-field redaction (replace ad-hoc `console.*`)

P1 (pre-release security/reliability):
- [x] Add centralized API error mapper/wrapper to enforce `{ data, error }` contract
- [x] Explicitly harden Auth.js session/cookie settings in `src/auth/options.ts`
- [x] Add migration rollback guidance doc

P2 (quality gate completion):
- [x] Add API contract tests
- [x] Add concurrency tests for versions/test-runs flows
- [x] Add seed script and typed repository helper layer

## Done (Verified)
- [x] Next.js 16 + TypeScript + Tailwind + shadcn/ui baseline
- [x] Drizzle schema for `users`, `prompts`, `prompt_versions`, `test_runs`
- [x] Initial Drizzle SQL migration generated in `drizzle/`
- [x] ESLint setup migrated for Next.js 16 + ESLint flat config (`npm run lint` now passes)
- [x] Local DB migration apply verified (`npm run db:migrate`)
- [x] Auth.js single-user credentials flow + protected app routes
- [x] Startup environment validation in `src/env.ts`
- [x] API response helpers in `src/lib/api-response.ts`
- [x] Login page + `/app` shell page

## Non-goals (Deferred)
- Queue/worker architecture, email, analytics, object storage
- Multi-user/team features
- A/B compare UI

## Next Steps (Closeout)
- [ ] Run `npm run seed` on a machine with local PostgreSQL access and capture output evidence.
- [ ] Run `npm test` in the same DB-connected environment and confirm concurrency specs execute (not skipped).
- [ ] Refresh `docs/AUDIT_REPORT.md` release-readiness table with final PASS/FAIL evidence references.
- [ ] Final docs polish + tag/release workflow (if shipping immediately).

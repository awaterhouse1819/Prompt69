# PromptRefine v1 — Active Plan (Updated 2026-02-23)

## Goal
Ship v1: prompt CRUD, immutable versions, test runs against OpenAI, and run history.

## Current Snapshot
- App foundation is implemented: Next.js app shell, credentials auth, route protection, env validation, Drizzle schema.
- API surface now includes auth + prompt CRUD/version APIs + test-run APIs (`src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/prompts/route.ts`, `src/app/api/prompts/[id]/route.ts`, `src/app/api/prompts/[id]/versions/route.ts`, `src/app/api/prompts/[id]/restore/route.ts`, `src/app/api/test-runs/route.ts`).
- Drizzle migration artifacts are generated (`drizzle/0000_melted_solo.sql` + `drizzle/meta/_journal.json`) and local migrate/apply succeeds.
- Runtime checks under Node `20.19.0`: `lint`, `typecheck`, and `build` pass.
- Local PostgreSQL environment is now aligned (`annawaterhouse` role + `prompt69` database), and migrations apply successfully.
- Remaining feature gaps: Milestone 4 P1/P2 quality gates; default shell runtime is still Node 18.

## Milestone 0: Environment Unblock (Do First)
- [x] `.env.local` exists and baseline keys are set (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD`)
- [x] Switch shell to Node `20.19.0` (`nvm use`) and confirm `node -v` matches
- [x] Re-run `npm run build` under Node 20 (pass)
- [x] Fix lint pipeline for Next.js 16 (migrated to ESLint flat config) and re-run lint (pass)
- [x] Confirm local PostgreSQL auth/user configuration for `DATABASE_URL`
- [x] Run `npm run db:generate` to create `drizzle/` migrations
- [x] Run `npm run db:migrate` and verify tables are created
- [ ] Commit infrastructure baseline changes (`drizzle/*`, `eslint.config.mjs`, `package.json`, `package-lock.json`, plan/docs deltas)
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
- [ ] Add centralized API error mapper/wrapper to enforce `{ data, error }` contract
- [ ] Explicitly harden Auth.js session/cookie settings in `src/auth/options.ts`
- [ ] Add migration rollback guidance doc

P2 (quality gate completion):
- [ ] Add API contract tests
- [ ] Add concurrency tests for versions/test-runs flows
- [ ] Add seed script and typed repository helper layer

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

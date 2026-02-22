# PromptRefine v1 — Active Plan

## Goal
Ship v1: prompt CRUD, immutable versions, test runs against OpenAI, run history.

## Non-goals (deferred)
- Queue/worker, email, analytics, S3
- Multi-user / team features
- A/B compare UI

## Milestone: v1 Local Baseline

### Setup (prerequisite)
- [ ] Create .env.local from .env.example with real values
- [ ] Confirm local PostgreSQL is running, create `prompt69` database
- [ ] Run `npm run db:generate` → generates migration SQL in /drizzle
- [ ] Run `npm run db:migrate` → creates tables in DB
- [ ] Run `npm run dev` → confirm app starts, login works

### Feature: Prompt List
- [ ] GET /api/prompts — list all prompts ordered by updated_at desc
- [ ] POST /api/prompts — create prompt (title, type, tags?)
- [ ] PATCH /api/prompts/[id] — update title/tags
- [ ] DELETE /api/prompts/[id] — delete prompt
- [ ] Update /app/page.tsx — show prompt list + New Prompt button + form

### Feature: Prompt Editor + Versions
- [ ] GET /api/prompts/[id] — fetch prompt with current version content
- [ ] GET /api/prompts/[id]/versions — list all versions
- [ ] POST /api/prompts/[id]/versions — save new immutable version
- [ ] POST /api/prompts/[id]/restore — set current_version_id to prior version
- [ ] Create /app/prompts/[id]/page.tsx — editor layout (textarea + version history)

### Feature: Test Runs
- [ ] Install openai package
- [ ] Add OPENAI_API_KEY to env.ts + .env.local
- [ ] POST /api/test-runs — call OpenAI, save result with token usage
- [ ] GET /api/test-runs?promptId=... — list runs newest first
- [ ] Wire Run button in editor with model selector (gpt-4o, gpt-4o-mini, o3-mini)
- [ ] Display output + run history in editor page

## Done
- [x] Bootstrap: npm init, GitHub remote connected, pushed to origin (f4d8943)
- [x] Next.js 16 + TypeScript + Tailwind + shadcn/ui baseline
- [x] Drizzle schema (users, prompts, prompt_versions, test_runs)
- [x] Auth.js single-user credentials login + route protection
- [x] env.ts startup validation
- [x] apiOk / apiError response helpers
- [x] Login page + /app shell page

# Prompt-Library

PromptRefine is a personal workspace for creating, versioning, and testing OpenAI prompts.

## Prerequisites
- Node `20.19.0` (pinned in `.nvmrc`)
- npm `>=10`
- PostgreSQL database reachable from `DATABASE_URL`

## Environment
1. Copy `.env.example` to `.env.local`.
2. Set all required values:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_ADMIN_EMAIL`
   - `AUTH_ADMIN_PASSWORD`
   - `OPENAI_API_KEY`

## Quick Start
```bash
nvm use
npm install
npm run setup
npm run seed
npm run dev
```

## Runtime Guardrails
- `npm run runtime:check` enforces the required Node version and npm minimum.
- Core scripts run runtime checks automatically via npm pre-scripts:
  - `dev`, `build`, `start`
  - `lint`, `typecheck`, `test`
  - `db:generate`, `db:migrate`, `db:studio`
  - `seed`

## Validation Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Notes:
- `tests/concurrency-flows.test.ts` requires DB connectivity and self-skips when DB is unavailable.
- `npm run seed` is idempotent and safe to rerun for local bootstrap.

## Operations Docs
- `docs/BACKUP_RESTORE_RUNBOOK.md`
- `docs/MIGRATION_ROLLBACK_GUIDANCE.md`
- `docs/FINAL_HARDENING_PROMPT.md`
- `docs/AUDIT_REPORT.md`

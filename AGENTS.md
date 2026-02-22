# PromptRefine — Agent Map

## What this is
Personal web workspace: create, version, test, and refine prompts for OpenAI models.
Single-user. Next.js 16 + TypeScript + Tailwind + Drizzle + PostgreSQL + Auth.js.

## Active plan
→ plans.md

## Requirements
→ PRD.md

## Detailed docs
→ docs/AUDIT_REPORT.md
→ docs/FINAL_HARDENING_PROMPT.md

## Key source paths
- DB schema: src/db/schema.ts
- API response helpers: src/lib/api-response.ts
- Auth config: src/auth/options.ts
- Route protection: src/middleware.ts
- App entry: src/app/app/page.tsx

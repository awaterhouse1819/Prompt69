# PromptRefine Migration Rollback Guidance

## Scope
This runbook defines rollback strategy for schema changes applied via Drizzle migrations.

## Preconditions Before Any Production Migration
1. Ensure a fresh backup exists (`docs/BACKUP_RESTORE_RUNBOOK.md`).
2. Confirm the app commit and migration set are version-aligned.
3. Record start time, operator, and target environment.

## Rollback Strategy
Drizzle migrations are forward-applied. Treat rollback as one of these paths:

1. **Fast restore (preferred for destructive failures)**
   - Restore database from last known-good backup.
   - Re-deploy the app commit that matches that backup schema state.

2. **Forward-fix migration (preferred for minor defects)**
   - Keep current DB state.
   - Create a new migration that corrects broken schema/data shape.
   - Deploy corrected app commit + forward-fix migration.

## Emergency Rollback Procedure (Backup Restore Path)
1. Freeze writes (maintenance mode or stop app traffic).
2. Capture current state for forensics:
   - failing migration name
   - error output
   - current commit SHA
3. Restore last known-good backup into scratch DB first.
4. Validate scratch DB:
   - required tables exist
   - key row-count checks pass
5. Promote restored DB (or restore production DB directly if policy allows).
6. Deploy matching app commit.
7. Run smoke checks:
   - auth login
   - `GET /api/prompts`
   - prompt create/version flows

## Forward-Fix Procedure
1. Reproduce migration issue in local/scratch environment.
2. Create corrective migration with `npm run db:generate`.
3. Validate by replaying full migration chain on clean DB.
4. Apply corrected migration with `npm run db:migrate`.
5. Verify API and app critical flows.

## Verification Checklist After Recovery
- `npm run lint` passes.
- `npm run typecheck` passes.
- Application startup succeeds with expected env.
- Prompt CRUD, version restore, and test-run endpoints respond successfully.

## Communication Checklist
- Log incident timeline and root cause.
- Capture affected migration file names and commit SHAs.
- Document whether recovery used restore or forward-fix path.

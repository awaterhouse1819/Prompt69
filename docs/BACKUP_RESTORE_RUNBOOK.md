# PromptRefine Backup, Restore, and Incident Recovery Runbook

## Ownership
- Primary owner: PromptRefine maintainer (single-user operator)
- Escalation path: Open an incident issue in this repository and capture correlation IDs from failing API requests.

## Backup Policy
- Scope: PostgreSQL database (`prompt69`) containing `prompts`, `prompt_versions`, `test_runs`, `users`.
- Cadence:
  - Nightly full backup.
  - Weekly retained snapshot.
- Retention:
  - Nightly backups retained for 14 days.
  - Weekly backups retained for 8 weeks.
- Storage location: Encrypted storage bucket or encrypted disk location outside local project directory.
- Encryption expectation:
  - Backup artifacts encrypted at rest (storage encryption enabled).
  - Backup transfer encrypted in transit (TLS).

## Backup Command (PostgreSQL)
```bash
export DATABASE_URL="postgresql://<user>:<password>@<host>:5432/prompt69"
mkdir -p backups
pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --file "backups/prompt69_$(date +%Y%m%d_%H%M%S).dump" \
  "$DATABASE_URL"
```

## Restore Command (PostgreSQL)
```bash
export RESTORE_DATABASE_URL="postgresql://<user>:<password>@<host>:5432/prompt69_restore"
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --dbname "$RESTORE_DATABASE_URL" \
  backups/<backup-file>.dump
```

## Restore Verification Checklist
- Confirm required tables exist: `users`, `prompts`, `prompt_versions`, `test_runs`.
- Run row-count sanity checks against source and restored copy.
- Run app validation checks:
  - `npm run lint`
  - `npm run typecheck`
- Smoke test API:
  - `GET /api/prompts`
  - `GET /api/test-runs?promptId=<id>`

## Restore Drill Frequency
- Frequency: Monthly.
- Drill definition:
  - Restore latest weekly snapshot into a scratch database.
  - Validate schema + sample query checks.
  - Record restore duration and issues.

## Incident Recovery Quick Steps

### 1. Accidental data deletion or corruption
1. Stop writes by pausing app traffic.
2. Identify recovery point objective (latest good backup timestamp).
3. Restore backup into scratch database first.
4. Validate data integrity in scratch database.
5. Promote restored database or selectively copy data back.
6. Resume traffic and monitor API error rates.

### 2. Failed migration
1. Stop deployment and pause writes.
2. Capture current DB state and migration logs.
3. Restore last known-good backup into scratch DB.
4. Validate schema compatibility with current app commit.
5. Re-run migrations in scratch DB before production recovery.
6. Apply recovery plan in production and monitor.

### 3. Third-party model outage (OpenAI failures)
1. Confirm failures via `test_runs.status = failed` and error messages.
2. Capture request correlation IDs from API responses for traceability.
3. Disable non-critical test-run usage until service stabilizes.
4. Retry impacted runs once provider health is restored.
5. Document incident timeline and mitigations in repository issue.

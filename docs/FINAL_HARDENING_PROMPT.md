# Final Hardening Prompt Requirements

Use this prompt at the end of implementation to ensure production hardening is complete.

## Required Checks

1. **Request correlation ID propagation**
   - Verify every incoming request gets a correlation ID (accept inbound header if present, generate if absent).
   - Verify the correlation ID is propagated through API handlers, background jobs, outbound service calls, and logs.
   - Verify API responses include the correlation ID header for support traceability.

2. **Structured logging with sensitive-field redaction**
   - Verify logs are structured JSON (or equivalent key/value structured format), not free-form strings.
   - Verify redaction/masking rules are enforced for sensitive fields (tokens, passwords, secrets, session IDs, cookies, PII where required).
   - Verify redaction applies in success logs, error logs, and debug logs.

3. **Standardized error mapping (no raw stack traces in API responses)**
   - Verify domain/internal errors map to a standardized API error contract.
   - Verify response payloads never expose raw stack traces, SQL errors, or unhandled exception internals.
   - Verify internal logs still retain diagnostic detail tied to correlation ID.

4. **Secure cookie/session settings verification**
   - Verify auth/session cookies are configured with secure defaults (`HttpOnly`, `Secure`, `SameSite`, scoped `Path`/`Domain`, explicit TTL/expiry).
   - Verify environment-aware behavior (e.g., `Secure` required in production).
   - Verify session rotation/expiration behavior matches policy.

5. **Documented backup/restore + incident recovery quick steps**
   - Verify backup and restore runbooks are documented with owner, cadence, storage location, encryption expectations, and test-restore frequency.
   - Verify an incident recovery quick-steps section exists for common outage/data-loss scenarios.
   - Verify commands/links are current and callable by on-call responders.

## Required Final Output Format

The final hardening response **must include** a release-readiness report table with PASS/FAIL per item.

### Release Readiness Report (required)

| Item | Status (PASS/FAIL) | Evidence | Gaps / Follow-ups |
|---|---|---|---|
| Request correlation ID propagation | PASS/FAIL | _files, tests, traces_ | _if FAIL, concrete fix_ |
| Structured logging + sensitive-field redaction | PASS/FAIL | _logger config, sample logs, tests_ | _if FAIL, concrete fix_ |
| Standardized error mapping (no raw stack traces) | PASS/FAIL | _error mapper, API response examples_ | _if FAIL, concrete fix_ |
| Secure cookie/session settings verification | PASS/FAIL | _auth/session config, env checks_ | _if FAIL, concrete fix_ |
| Backup/restore + incident recovery quick steps documented | PASS/FAIL | _runbook paths/sections_ | _if FAIL, concrete fix_ |

## Completion Rule

Do not mark hardening complete unless all five required checks are explicitly assessed and the release readiness report is present.

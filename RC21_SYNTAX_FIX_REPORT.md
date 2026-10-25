# RC21 syntax fixes — 2026-10-24

Two source files changed; release metadata remains RC21.

## Changelog
- src/App.tsx:1200 — close the conditional archive-error JSX expression before the customer search form. No customer workflow changes.
- supabase/migrations/202610201800_customer_pickup_notifications.sql:117 — parenthesize the CASE expression used by the optimistic status comparison. Preserve row locks, workspace checks, role checks, status transitions and stock protections.

## Local validation
- npm run build: PASS (exit 0). TypeScript and Vite production bundle complete. Vite reports a non-blocking large-chunk warning.
- Database integration: all 97 migrations apply to local PGlite successfully. The suite subsequently fails at tests/ux-database.cjs:58 because the tracking response includes the customer note 'Private customer note', contrary to that test's expectation. This is a separate unresolved response-contract/test discrepancy, not a migration syntax failure. The full database suite does not pass.
- Existing local dependencies reused; no downloads. No live systems or production data accessed. Not deployed.

## Scope and remaining requirements
Only the two requested syntax defects were corrected. Previous RC21 testing limitations and unrelated failures remain; this package is not certified deployment-ready. Full tests after resolving the tracking-response discrepancy and target-environment validation are still required. Historical reports included from RC21 describe their original runs; this report and validation logs describe this patch.

For a fresh database, use the corrected migration in the normal migration sequence. Do not manually replay all migrations against an existing production database. Any previously failed live migration needs its actual applied state reviewed before retrying; no live state was inspected here. Existing deployment/configuration instructions remain in the source package.

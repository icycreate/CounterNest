# CounterNest POS v1.7.0 — Phases 31.0 and 31.2

## Phase 31.0 — Deployment and operational acceptance

- Added an administrator-only Operational Acceptance page.
- Added required checks for active administrators, active products, recent backups, valid ingredient balances and recipe integrity.
- Added advisory checks for overdue production and products without costs.
- Every server acceptance run records its checks, result, manager note, staff member and timestamp.
- Added `scripts/RUN_PHASE31_ACCEPTANCE.ps1` for local manifest, environment, migration and build validation with JSON evidence.

## Phase 31.2 — Production planning

- Added a Production Planning management page with daily and weekly date ranges.
- Added automatic recipe scaling from planned sellable output and expected recipe waste.
- Added ingredient requirements consolidated across scheduled batches.
- Added committed-stock calculations so a new plan accounts for existing scheduled production.
- Added maximum-producible guidance based on the limiting ingredient.
- Plans with shortages are blocked by default. An administrator may explicitly record a shortage override for purchasing before production.
- Planning does not deduct stock; the established Phase 30.8 production-completion transaction remains responsible for physical consumption.

## Supabase

Apply migrations 33 and 34 after migrations 1–32. Test on a separate Supabase project, create a verified backup, run Phase 31 Operational Acceptance, and only then approve production deployment.

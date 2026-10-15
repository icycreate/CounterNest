# CounterNest POS v1.14.0 — Phase 33.1

- Added **Report Issue** for active administrators and employees.
- Staff can submit operational reports using controlled urgency and category values.
- Staff can view only the status and resolution of reports submitted by their own account.
- Staff reports create the same permanent incident references and immutable events used by Operations Center.
- Added administrator triage controls for severity, category, status, investigation notes, resolution, and reopening.
- Direct incident editing and deletion remain unavailable.
- Added migration 44 and regression acceptance checks for staff isolation and administrator-only triage.
- Retained the corrected migration 41 from v1.13.1 Hotfix 1.

No live Supabase project is modified automatically. Apply migration 44 only after migrations 41–43 have succeeded and the change has been tested outside production.

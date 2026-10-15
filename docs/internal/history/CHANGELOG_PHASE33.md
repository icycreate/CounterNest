# CounterNest POS v1.13.0 — Phase 33.0

- Added an administrator-only Operations Center for post-go-live monitoring.
- Added shop-scoped operational incidents with permanent references, severity, category, impact, status, reporter, timestamps, and resolution evidence.
- Added append-only incident events for opening, investigation/status updates, notes, resolution, and reopening.
- Added health indicators for critical and aging incidents, prior-date Daily Cash, backup recency, recalls, Phase 32 approval, and current-device connectivity.
- Added active/resolved/all filtering, text search, CSV export, and print support.
- Extended the protected business backup to include incidents and events using schema version 1.13.0.
- Added migration 43, Phase 33 acceptance checks, installer identity updates, and operating instructions.
- Preserved all Phase 32.9 POS, Supabase, Daily Cash, loyalty, inventory, production, traceability, backup, and rollback behavior.

No live Supabase database is modified by the release package itself. Apply migration 43 in a separate test project before production.

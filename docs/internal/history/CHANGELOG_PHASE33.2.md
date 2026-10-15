# CounterNest POS v1.15.0 — Phase 33.2

## Added

- Shift Handover navigation and responsive operations-log UI for active staff.
- Structured summary, pending actions, stock notes, equipment notes, and incident references.
- Incoming-staff acknowledgement with self-acknowledgement and duplicate-acknowledgement prevention.
- Administrator-only closure after acknowledgement, with a required closing note.
- Immutable created, acknowledged, and closed events.
- Shift handover records in the administrator business backup export.
- Migration 45 and automated Phase 33.2 acceptance checks.

## Preserved

- Existing checkout, Daily Cash, inventory, loyalty, issue reporting, incident management, and Phase 32 go-live behavior.
- The migration 41 PostgreSQL hotfix and all Phase 33.1 protections.
- Prior release packages for rollback.

No live Supabase project is changed by this package. Test migration 45 before applying it to production.

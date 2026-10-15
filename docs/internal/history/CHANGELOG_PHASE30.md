# CounterNest POS v1.0.0 — Phase 30

- Added administrator-created, already-confirmed staff accounts without email delivery.
- Added a cryptographically generated temporary-password option and one-time credential handoff panel.
- Added mandatory first-login password replacement before any POS screen is accessible.
- Added staff password-state visibility, inactive-account sign-out, and audit events.
- Added migration 20 and protected `create-staff-account` and `change-initial-password` Supabase Edge Functions.
- Preserved existing staff invitations as an optional SMTP-backed fallback.
- Preserved all Phase 29 sales, cash, receipt, inventory, reports, and Windows/web behavior.

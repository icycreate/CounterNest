# CounterNest POS v1.0.0 — Phase 24

- Added production Supabase configuration validation.
- Enforced the internal local URL `http://127.0.0.1:4173`.
- Rejects placeholder values and any frontend value containing `service_role`.
- Confirms the expected 19 migration files before production approval.
- Added an optional production Supabase connectivity check.
- Added the production setup, company-isolation, backup, and evidence checklist.

No new Supabase migration is required. Existing POS and Daily Cash behavior are unchanged.

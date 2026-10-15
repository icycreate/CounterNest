# ChubbyLu Bakery POS v0.17.0 — Phase 17 Backup Readiness

- Added administrator-only portable business backups.
- Added SHA-256 integrity files.
- Added backup export-request history.
- Excluded passwords, PIN hashes, credentials, and invitation tokens.
- Added secure-storage and controlled-restore guidance.

Database migration: `supabase/migrations/202608180900_business_backup.sql`


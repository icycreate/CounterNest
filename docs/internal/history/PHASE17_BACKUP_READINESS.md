# Phase 17 — Business Backup and Release Readiness

Administrators can export a portable JSON snapshot of operational business data and a matching SHA-256 integrity file. Export requests are logged. Passwords, manager PIN hashes, Supabase credentials, invitation tokens, and device-local hardware settings are excluded.

Backups contain customer and operational data and must be encrypted and access-controlled. Automatic restore is deliberately excluded from the POS because it can overwrite live data; recovery must first be tested in a separate Supabase environment.

Apply `supabase/migrations/202608180900_business_backup.sql` after Phase 16.


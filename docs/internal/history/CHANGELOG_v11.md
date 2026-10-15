# ChubbyLu Bakery POS v0.11.0 — Phase 11 Unified Audit

- Added an administrator-only unified audit screen.
- Consolidated staff access, drawer, refund/void, inventory, and reprint activity.
- Added date, category, and text filters.
- Added CSV and print/PDF export.
- Added server-side shop isolation and administrator enforcement.
- Limited each audit request to 366 days and 500 records.

Database migration: `supabase/migrations/202608180840_unified_audit_log.sql`


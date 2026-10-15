# ChubbyLu Bakery POS v0.12.0 — Phase 12 Expenses

- Added administrator-only, append-only expense records.
- Added category, vendor, reference, date, amount, and payment fields.
- Cash expenses automatically create an audited drawer cash-out when a shift is open.
- Added date-range totals, CSV export, and print/PDF output.
- Added all expenses to the unified audit log.

Database migration: `supabase/migrations/202608180850_expenses.sql`


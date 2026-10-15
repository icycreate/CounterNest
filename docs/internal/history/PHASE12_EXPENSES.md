# Phase 12 — Expense Tracking

Administrators can record append-only business expenses with date, category, description, amount, payment method, vendor, and receipt/reference. Cash expenses automatically reduce the expected balance of an open cash drawer. Non-cash expenses never affect drawer cash.

Expenses support date-range summaries, CSV export, and print/PDF output. Every expense appears in the unified audit log. Apply `supabase/migrations/202608180850_expenses.sql` after Phase 11.


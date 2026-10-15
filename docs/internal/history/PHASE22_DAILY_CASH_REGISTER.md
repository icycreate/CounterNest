# Phase 22 — Daily Cash Register

CounterNest no longer presents or configures a physical cash drawer. The former Cash Drawer module is now **Daily Cash**, a Supabase-backed accounting and audit reference for cash activity during a business day or shift.

## Included

- Start the daily cash record with existing cash/opening amount.
- Automatically include completed cash sales and cash refunds in expected cash.
- Record additional cash in with a required reason.
- Record cash out, safe drops, petty cash, and cash expenses with an audit trail.
- Count cash at closing and calculate expected-versus-counted variance.
- Preserve closed-day history for management reports and audits.

## Removed

- Open-drawer-through-printer switch.
- Drawer connector pin selection.
- Drawer pulse duration.
- Any suggestion that CounterNest controls physical drawer hardware.

The underlying Supabase table and RPC names still contain `cash_drawer` for migration compatibility. This is an internal database name only; existing records and integrations remain intact. No new database migration is required.

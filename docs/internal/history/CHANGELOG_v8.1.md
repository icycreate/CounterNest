# ChubbyLu Bakery POS v0.8.1

## Management cash drawer

- Added an administrator-only Cash Drawer screen on desktop and mobile.
- Added start-of-shift opening with existing cash/opening float.
- Added audited cash-in and cash-out adjustments with mandatory reasons.
- Cash sales and POS-recorded cash refunds automatically update the open drawer.
- Added expected-versus-counted closing, saved variance, shift notes, and recent drawer history.
- Added Supabase tables, shop-scoped RLS, RPC-only writes, append-only transaction history, and a one-open-drawer-per-shop rule.
- Preserved checkout behavior: sales still work if management has not opened a drawer.

Database migration: `supabase/migrations/202608180800_cash_drawer.sql`



# Phase 31.7 — Ingredient Lot and Expiry Traceability

## Release identity

- CounterNest POS v1.9.0
- Phase 31.7
- Supabase migration count: 39

## Added

- Supplier lot/batch code entry for every ingredient delivery.
- Optional manufacture and expiry dates captured with the receipt.
- Ingredient lot register with remaining quantity, supplier, dates, cost snapshot, and calculated status.
- FEFO production allocation: earliest-expiring usable stock is consumed first.
- Expired and recalled lots are blocked from production.
- Trace view showing every production batch that consumed a selected supplier lot.
- Administrator-only lot metadata correction, recall, and controlled disposal.
- Expiring-soon window and warnings for expired, recalled, and legacy untracked stock.
- Lot records, allocations, and events included in the supply-operations JSON backup.
- Operational acceptance check for lot-ledger consistency.

## Preserved

- Existing checkout, loyalty, product, recipe, purchasing, receiving, waste, and reporting behavior.
- Ingredient quantity remains the authoritative inventory balance; lot quantities reconcile to it.
- Existing ingredient balances are backfilled into clearly identified opening/untracked lots.
- Historical audit records remain append-only.

## Deployment

Apply `supabase/migrations/202608241100_ingredient_lot_traceability.sql` after migrations 1–38, then restart/rebuild the installed web application.

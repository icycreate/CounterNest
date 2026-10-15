# CounterNest POS v1.6.0 — Phases 30.5 to 30.9

## Phase 30.5 — Trusted local-network access

- Added separate local-only and local-network Windows shortcuts.
- Added an administrator firewall helper limited to the Windows Private profile and `LocalSubnet`.
- Added automatic private IPv4 detection and clear protection against accidentally mixing local-only and LAN listeners.
- Documented that camera scanning and PWA installation on remote LAN devices normally require HTTPS.

## Phase 30.6 — Ingredient stock inventory

- Added ingredients measured in grams, millilitres, or each.
- Added reorder levels, preferred stock targets, supplier preference and lead time.
- Added append-only manual stock adjustments and weighted-average receiving costs.
- Restricted management and visibility to active administrators through Supabase RLS and protected RPCs.

## Phase 30.7 — Product recipes and costing

- Added versioned recipes linked to finished products.
- Added batch yield, ingredient quantities, labor, overhead, packaging, expected waste and target margin inputs.
- Every recipe modification creates an immutable JSON snapshot for audit/history.

## Phase 30.8 — Recipe-aware production

- Completing a scheduled production batch validates every required ingredient first.
- Ingredient deductions, cost snapshots and finished-product stock are committed atomically.
- Insufficient ingredient stock cancels the entire transaction, preventing negative balances or unsupported finished stock.
- Products without an active recipe keep the established production behavior.

## Phase 30.9 — Restocking and optional pricing guidance

- Added recommended ingredient purchases based on preferred target, scheduled production demand and available stock.
- Added calculated unit cost and recommended selling price based on the administrator's target margin.
- CounterNest never changes a product price automatically. The administrator must confirm **Use Recommended Price**, and that decision is audited.
- Phase 17 business backups now include recipe, ingredient, consumption, receiving and price-change records.

## Supabase application order

Apply migrations 29–32 in filename order after the existing 28 migrations. Test them on a separate Supabase project and create a verified backup before applying them to production.

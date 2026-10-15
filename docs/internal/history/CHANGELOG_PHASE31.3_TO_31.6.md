# CounterNest POS v1.8.0 — Phases 31.3 to 31.6

## Phase 31.3 — Supplier and ingredient purchasing

- Adds editable supplier contact, address, payment-term, notes, and active-status profiles.
- Adds multi-line ingredient purchase orders with expected quantities, costs, delivery date, status, and append-only events.
- Keeps the established finished-product purchase-order feature unchanged.

## Phase 31.4 — Controlled ingredient receiving

- Supports partial deliveries and keeps incomplete orders open.
- Captures supplier invoice reference, actual delivered quantity, and actual unit cost.
- Atomically updates ingredient quantity, weighted-average cost, receipt history, purchase-order status, and inventory movement.
- Preserves favorable or unfavorable expected-versus-actual purchase cost variance.

## Phase 31.5 — Waste and spoilage

- Records ingredient or finished-product waste by reason.
- Prevents waste from exceeding available stock.
- Deducts inventory immediately and preserves a cost snapshot, staff member, time, and note.
- Existing production-completion waste remains the correct workflow for in-process batch yield waste.

## Phase 31.6 — Operational performance

- Adds a date-filtered Supply Operations dashboard.
- Shows net sales, COGS, gross profit, manual waste cost, purchase variance, production attainment, supplier spend, and waste by reason.
- Calculates a clearly labeled tracked-contribution management figure; it is not an accounting or tax statement.
- Adds a separate JSON backup for Phase 31.3–31.6 operational records.

## Database order

Apply migrations 35–38 after migrations 1–34. Test on a separate Supabase project and create a verified backup before production deployment.

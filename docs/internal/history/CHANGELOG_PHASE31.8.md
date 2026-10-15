# Phase 31.8 — Finished-Product Batch Recall Traceability

## Release identity

- CounterNest POS v1.10.0
- Phase 31.8
- Supabase migration count: 40

## Added

- Finished-product batch record created when production is completed.
- Required finished batch code and optional best-before date in the production-completion dialog.
- Automatic FEFO allocation from finished batches to sale items at checkout.
- Restocked refunds and voids return quantities to their original batches.
- Recalled returns stay quarantined instead of re-entering sellable stock.
- Administrator batch recall with immediate unsold-stock quarantine.
- Receipt and customer trace showing allocated, returned, and net affected quantities.
- CSV export for controlled recall follow-up.
- Audited disposal of quarantined finished products.
- Opening/untracked batches for inventory that existed before Phase 31.8.
- Operational acceptance check reconciling active batch quantities with sellable product stock.

## Preserved

- Cart, payment, receipt, loyalty, refund, void, and inventory quantity behavior.
- Pre-upgrade sales remain unchanged and are not falsely assigned to production batches.
- Guest sales remain traceable by receipt and time, but have no invented contact information.
- Recall and disposal records remain immutable.

## Deployment

Apply `supabase/migrations/202608241200_finished_product_batch_traceability.sql` after migrations 1–39, rebuild CounterNest, and run Phase 31 Operational Acceptance.

# Phase 36.2 — Product Variants & Independent Pricing

Variants / Combos / Displays → Variants adds product-linked variants with separate name, price, SKU, barcode, optional image URL, inventory mode, recipe scale, optional unit cost and active/disabled state.

Shared variants deduct the same master product stock and use its finished-batch FEFO allocations. Independent variants use a separate variant lot/allocation/event ledger, avoiding contamination of existing master stock and readiness checks. Receive or remove independent stock with Adjust stock; received lots can have best-before dates. Mode cannot change after creation; disable and create a replacement instead.

POS barcode scanning resolves variant barcodes. Receipts preserve name, SKU/barcode, inventory mode and recipe-scale snapshots. Existing sales/profitability use actual prices and cost snapshots. Percentage promotions apply to variant base price; fixed specials are capped at the variant regular price. Approved variant production multiplies master recipe demand by the variant scale, consumes ingredients through the existing completion workflow, then transfers output atomically into independent stock when applicable.

This phase is part of v1.54.0. Upgrade from v1.44.0 with migrations 68–77; read PHASE36.0_TO_36.9_UPGRADE.md and the UAT checklist.

Use Lots / Recall for independent-lot holds and disposal. Recalls of a linked source finished-production batch automatically hold its transferred variant lots. Refunds into held lots remain unavailable; disposal does not deduct available stock a second time.

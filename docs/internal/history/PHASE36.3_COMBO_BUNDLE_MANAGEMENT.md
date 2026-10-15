# Phase 36.3 — Combo & Bundle Management

Variants / Combos / Displays → Combos defines fixed components or choose-one-from-category slots, per-slot quantities, fixed variant selections, combo price, descriptions/images, seasonal labels, active flag and optional start/end times.

Catalogue combo details show component choices and the separate-item value once choices are complete. Checkout validates category membership, active product/variant, dates and price on the server. It expands a bundle into receipt component lines with a common combo snapshot, quantities and allocated prices that sum exactly to the combo price.

Stock and FEFO deductions happen once per component inside the sale transaction. Cost snapshots remain component-specific. Refunds use allocated line values, not current menu prices. Fractional component quantities may produce a rounded displayed unit price whose line total differs by a cent; allocated line totals and invoice total are authoritative. Disable old definitions instead of deleting history.

This phase is part of v1.54.0. Upgrade from v1.44.0 with migrations 68–77; read PHASE36.0_TO_36.9_UPGRADE.md and the UAT checklist.

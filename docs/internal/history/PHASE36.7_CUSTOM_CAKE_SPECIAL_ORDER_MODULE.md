# Phase 36.7 — Custom Cake / Special Order Module

Create a scheduled order with type Custom cake / Special order. Select one master product/variant line, then enter cake size, flavor, filling, frosting, decoration/theme, message/writing, customer notes and production instructions. Set pickup/deadline and the quoted subtotal before tax.

Reference JPG/PNG/WebP images up to 8 MB upload to a private shop-scoped bucket. Staff open them with short-lived signed links. Quotes, deposits, remaining balance, status, customer linkage and production approval use the same scheduled-order pipeline.

The saved custom quote overrides only this order’s sale line; it never changes the master price. Receipt snapshots include the custom-order details. Reference images, customer data and production instructions never appear on the public ready display. Newly disabled variants cannot be selected for new orders; a retained quoted order remains a historical obligation and may be fulfilled from its saved snapshot where stock is usable.

This phase is part of v1.54.0. Upgrade from v1.44.0 with migrations 68–77; read PHASE36.0_TO_36.9_UPGRADE.md and the UAT checklist.

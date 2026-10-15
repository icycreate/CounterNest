# CounterNest POS v1.26.0 — Phase 34.3

## Added
- Internal customer-facing product catalog and selection screen.
- Token rotation and enable/disable controls in **Customer View Setup**.
- Configurable Main/Sub POS routing labels.
- Global target-POS waiting notification plus New Sale request inbox.
- Empty-cart safety before loading a customer request.
- Current-stock revalidation when the cashier loads a request.
- Pending request claim/dismiss evidence.
- Optional supply/import photo during finished-product Stock Receiving.
- Optional supply/import photo during ingredient purchase-order receiving.
- Private `supply-imports` storage bucket with shop isolation and short-lived signed viewing URLs.
- Supply-photo count/view action in receiving history.

## Database
- Adds migration 54: `202608301300_phase34_3_customer_selection_supply_photos.sql`.

## Not changed
- Customer selections do not complete a sale or take payment.
- POS remains the final authority for price, stock, discounts, loyalty, tender, receipts and inventory deduction.
- Same-network frontend deployment remains the active deployment model.

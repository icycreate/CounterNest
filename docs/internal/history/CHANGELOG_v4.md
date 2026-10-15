# ChubbyLu Bakes POS — v4 Change Log

## Sales adjustments

- Added item-level partial refunds.
- Added “refund remaining sale” flow.
- Added sale voiding for mistaken completed sales.
- Added optional inventory restock on refunds; voids always restore stock.
- Added sale lifecycle states: Completed, Partially Refunded, Refunded, and Voided.
- Added net-sale calculations to Dashboard, Sales, and Reports.

## Manager authorization

- Added Admin manager PIN setup under Settings.
- PIN is stored as a bcrypt hash in the existing `staff_profiles.pin_hash` field.
- Refunds and voids require a manager PIN and reason.
- Audit records save the processing staff user and approving manager user.

## Loyalty handling

- Partial refunds proportionally reverse points/stamps earned by the original sale.
- Point/stamp reversal is capped at the member’s current balance to avoid a negative balance.
- Full refund/void restores points/stamps spent on the original reward redemption.
- Loyalty reversals/restorations are written to the existing loyalty transaction history.

## Receipt and audit history

- Historical receipt payload now includes sale status, refunded total, refunded quantity by item, and adjustment history.
- Receipt UI displays refund/void status, original total, adjusted amount, and net sale.
- Added receipt reprint logging and a reprint counter.
- Added `sale_refunds`, `sale_refund_items`, and `receipt_reprints` tables.

## External payments

- Card/QR adjustment dialogs clearly state that this version records the POS-side refund/void only.
- Optional external payment/cancellation reference notes can be stored for reconciliation.
- Automatic payment-provider refunds remain a future integration.

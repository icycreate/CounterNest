# Phase 36.6 — Pre-Orders & Pickup Scheduling

Pre-Orders / Custom Cakes records a shop customer, pickup timestamp, production deadline, products/variants/combos, quantities, notes, saved quote, status and deposits. Search by customer/order/type/status; switch between list and date-grouped calendar views.

Record deposit captures cash/card/QR money received, with a unique client key preventing duplicate submission. Cash deposits require an open drawer. Administrators can approve linked production jobs atomically; repeated approval is blocked until existing jobs are cancelled. Changing order items/deadline after production approval requires cancelling those jobs.

Final POS payment locks the order, verifies its remaining balance, writes one sale, consumes stock once and links the order to customer sales/history. The full invoice remains sales revenue; prepaid deposits reduce the balance paid and offset the final cash-sale ledger without being counted as new revenue. Deposit cancellation requires recording refunds before cancellation. External card/QR money movement must be performed through the business payment process; this app records it.

This phase is part of v1.54.0. Upgrade from v1.44.0 with migrations 68–77; read PHASE36.0_TO_36.9_UPGRADE.md and the UAT checklist.

# Phase 36.4 — Customer Order Number & Preparation Screen

Submitted customer selections receive shop-local, date-prefixed numbers such as 1012-001. Numbers are allocated under a transaction-safe per-shop/day counter; numbers never reuse an existing request identity.

Preparation / Kitchen lists active orders with items, variants/options, quantities, notes, counter, payment flag, age and state. Workflow is Received → Preparing → Ready → Collected/Completed. Staff can advance states; collection requires payment. Administrators may cancel unpaid orders. All changes append commercial audit events.

Use /?preparation=1 (or /preparation) for a staff-authenticated screen without the POS sidebar. A cashier can claim an unclaimed order that kitchen staff have already started. Fulfillment is independent from payment and never deducts stock. Scheduled pickup/custom cake jobs appear in the same kitchen screen with their production instructions.

This phase is part of v1.54.0. Upgrade from v1.44.0 with migrations 68–77; read PHASE36.0_TO_36.9_UPGRADE.md and the UAT checklist.

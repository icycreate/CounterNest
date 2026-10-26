# Customer Recognition & Order Linking Update — RC24

Date: 2026-10-25. Base: complete RC23 source, including the corrected existing About page.
**Status: locally implemented, UNTESTED, NOT BUILT, NOT DEPLOYED. No migration executed.**

## Added
- Staff-only exact E.164 candidate recognition scoped to the request's business. Formatting differences are compared without rewriting customer phone values. Country numbering patterns/lengths are generated from the existing local phone library metadata.
- Indicators for linked, guest, exact candidate, name conflict, multiple candidates, archived and unmatched requests. A candidate is never an automatic identity decision.
- Review Match dialog with original submitted name/phone, candidate cards, explicit radio selection, Customer History, reason, staff-confirmation checkbox, Confirm Customer Link and Leave as Guest.
- Staff search by name, Customer ID or complete international phone for historical/unreliable numbers. No final-digit or cross-country suffix matching. Nonmatching record selection is an explicit staff decision with an audit reason.
- Optional Create Customer with a serialized duplicate check for full normalized phone or matching name. Duplicate detection includes archived records. Repeated operation keys replay without creating another customer. A duplicate warning leaves review/link/guest choices available; no merge or forced duplicate action is introduced.
- Admin-only Restore Customer reuses the existing restore RPC. Archived records are not automatically restored or linked to new operational orders.
- Private association metadata: stable Customer ID, request ID, workspace, state, method=staff_confirmation, staff ID, timestamp, reason and revision. Existing commercial audit events retain before/after association and operation ID.

## Modified
- CataloguePreorders.tsx: recognition component alongside the existing request snapshot and actions. Recognition loads separately and cannot hold up anonymous submission.
- CommercialOperations.tsx: recognition review on accepted orders; linked Catalogue request history added to the existing CustomerOrderHistory dialog (alongside scheduled/custom orders, sales and loyalty). Existing guest scheduled orders remain editable without silently selecting the first Customer List entry. Association selection for Catalogue orders is routed through Review Match.
- accept_catalogue_preorder: removed automatic same-name/contact matching and implicit customer creation. Reuses only an active, staff-confirmed association. Otherwise creates the accepted operational order with a nullable guest customer relationship. Existing quote, deposit, production, audit and status logic remain in the current function.
- schedule_catalogue_preorder: legacy admin-only scheduling requires the same confirmed association; its original role gate is preserved.
- save_scheduled_order: permits a null customer only for an existing accepted Catalogue guest; new manual scheduled orders retain their existing customer requirement.
- Scheduled-order lists and calendar projections retain guest rows and use the submitted name when no linked customer exists.
- get_customer_history_rc19: extends the existing authorized history result with linked Catalogue requests, including custom-cake request types. No profile lookup is added to public tracking.
- English, Spanish, Traditional Chinese and Simplified Chinese system labels and responsive theme-aware candidate cards/dialogs. No product card or About page changes.

## Preserved
The public submission RPC, idempotency key, request snapshots, original names/contacts/items/prices/timestamps, guest tracking capability, and notification permission flow are unchanged. No matching trigger or network lookup runs in the submission transaction. Staff-side recognition failures leave the order intact for later review.

No existing customer is overwritten, merged, deleted, reactivated or retrospectively linked by the migration. Active/Archived/All filters remain as before. Photos, inventory, recipes, payments, prices and existing financial records remain unchanged.

Linking does not touch sales or loyalty. For an unpaid accepted order it changes only customer_id, under a lock, without recreating/repricing the order. The existing complete_scheduled_order_sale passes that customer_id to complete_sale, where existing qualifying sale-completion/loyalty rules apply. Its paid-order guard remains in place. No points or stamps are awarded for matching, review, creation or linking. Paid/completed/cancelled accepted orders reject relationship changes; historical reconciliation remains outside this feature.

## Database changes
New additive migration: `supabase/migrations/202610251000_customer_recognition.sql`.
- Private customer_recognition_phone_rules metadata table.
- Private catalogue_customer_links relationship table and customer_link_operations retry ledger, with RLS and no direct anonymous/authenticated table privileges.
- Scoped RPCs get_customer_recognition, get_order_customer_recognition and resolve_customer_recognition; strict same-workspace validation of request and customer IDs.
- Full-phone expression index; nullable scheduled_customer_orders.customer_id for genuine guests.
- Scheduled relationship guard blocks alternate editing paths from assigning an unconfirmed customer.
- Request locking and expected association revisions reject simultaneous conflicting confirmations. Order locks prevent relinking during/after payment. Operation keys are bound to request and arguments. Customer creation serializes the duplicate check with customer writes.
- Existing acceptance/scheduling/history/calendar functions are extended without altering previously applied migration files. Migration definition checks abort if the installed function source differs from the expected supplied baseline.

## Permissions and privacy
Only the existing admin/cashier customer-service roles can view/review/link/search/create through this feature; workspace recovery locks are respected. Managers retain their existing order-handling permissions but are not granted new customer-history/association rights. Restore remains admin-only. This intentionally does not broaden staff permissions.

Anonymous callers have no candidate endpoint or association-table access. Customer IDs/candidate counts/loyalty are never added to the public request response, snapshot or push payload. Matching a phone does not authorize account access. Customer tracking remains scoped to its original private request link.

## Known limitations and unverified behavior
- Formatting/numbering-plan validity, a possible identity match, and an explicit staff-confirmed relationship are distinct. No verified-customer account or OTP service was found; none is invented. Optional future SMS/WhatsApp OTP needs a real external provider, consent, rate limits and separate secure ownership verification.
- Recognition is computed when authorized staff open an order/review it, not a background phone directory lookup. Refresh/reopen review after concurrent changes; stale revisions fail safely. No candidate decision blocks public ordering.
- Existing international-formatted legacy phones can match; local-only or unsupported metadata numbers require staff search/review. See PHONE_RECOGNITION_METADATA.md. No current numbering-plan freshness claim is made.
- Already-paid orders cannot be relinked or receive retrospective loyalty via this feature. Pre-existing implicit customers/orders are not automatically reconciled.
- New private association/operation tables must be included in operator-managed database backups; older portable workspace backup manifests do not automatically include them. Use full database backup/restore procedures until a separately validated portable-backup extension is available.
- Earlier release test reports remain historical. Their known unrelated test-harness/response-contract issues were not fixed in this task.
- All new UI, SQL, PostgreSQL regex behavior, concurrency, RLS, migration guards, accepted guest order edits, sales and loyalty integration remain UNVERIFIED. No automated tests, manual browser tests, typecheck, build, API tests, migration execution or live service access occurred. Executed code generation only extracted static local phone metadata into source.

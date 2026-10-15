# Supabase upgrade — RC1 update
Inspected baseline: original CounterNest RC1, 78 local migrations ending 202610150900_rc1_security_hardening.sql. This update adds **only file 79**, 202610151200_customer_requests_register.sql. All earlier files remain byte-identical. The remote applied level has not been inspected; no live database was accessed or modified.

## Verify pending files
Confirmed at 78: run only 79 once. Confirmed at 77: run 78 then 79. Fresh empty project: all 79 in SUPABASE_MIGRATION_ORDER.md. Other levels: compare deployment records, actual schema/function definitions and any CLI history before applying the exact pending sequence.

The legacy chain includes duplicate version prefixes (20260815 and 20260816) and mixed date lengths. Do not blindly run supabase db push, rename/squash old migrations, or repair ledger entries to force a push. Use the SQL Editor or a DBA-controlled sequential process with a record of filename/hash/operator/time. Stop on errors.

## File 79
Runs in a transaction and preserves existing records. Adds customer request settings to the existing display config; two request/event tables with RLS, shop/config/order/user foreign keys and indexes; token-checked anonymous intake; staff review/contact preparation; admin override and scheduling; status synchronization with actual scheduled orders; admin station-aware register opening; unified audit entries and business export extensions.

The public RPC takes an idempotency UUID, validates one of the enabled contact methods, sanitizes item fields, normalizes live promotional/variant prices and saves no cost fields in the customer summary. Requests do not reserve or deduct stock and do not take payment. Limits: 25 cart lines, 20 units per input line, three requests per contact per ten minutes and 500 per display per day. These are basic abuse caps, not comprehensive bot protection.

API roles cannot write request/event tables directly. Authenticated SELECT is limited to the effective shop. Public users get a receipt number only and cannot read the inbox. Alternate contact requires active shop admin, alternate destination and a reason. One override does not change the stored preference or authorize later employee use of that alternate method. Nothing sends a message automatically.

A linked scheduled order is created only after confirmation with agreed pickup/deadline and an existing same-shop customer. Its current quote must be reviewed; normal deposit/payment/stock rules apply. Its state drives Scheduled → In Production → Ready → Collected; collection still requires payment.

Register opening is admin-only, serializes against the shop row and retains the existing one open register per shop / one daily record rule. Station is recorded for that shared register; this is not a new multi-drawer accounting module. Legacy opening RPC delegates to the same audit path. The old staff declaration RPC is revoked, retaining its historical rows.

## Deployment and acceptance
Back up PostgreSQL/Storage, rehearse in staging and compare historical counts/receipts. Pause mutations; apply only pending SQL; deploy all stations together. Deploy/reconfirm the four original RC1 account handlers as listed in EDGE_FUNCTIONS.md. Set Auth/Storage/Vercel configuration, save permitted contact settings and final public URL, and test with admin/employee/another shop plus logged-out customer.

Supabase platform grants, real Auth/Storage/Edge/PIN behavior and concurrent lock contention still require live UAT. Local tests use PGlite with service stubs. No automated reverse migration or full JSON restore is supplied. The portable export adds customer_request_records but still excludes Auth and Storage binaries.

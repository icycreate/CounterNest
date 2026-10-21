# Catalogue → Pre-Order notifications — RC17

Implemented in the complete RC16 source. **Not tested or build-validated.** No website, external API, live database, GitHub or Vercel connection was made. Nothing was deployed. The SQL migration is supplied for manual application only.

## Customer submission

The existing Catalogue cart leads through Place order, customer contact information, review and submission. Phone/country-code input is required even when a non-phone contact method is selected. Pickup time remains optional and is agreed with staff later.

The existing idempotent submission RPC, retry key, rate limits, price validation and status link are retained. A new immutable submission snapshot records the request UUID/number, client key, server timestamp, product/variant/option names, quantities, submitted item selections and prices, subtotal, estimated tax/total, currency, name, international phone, preferred contact method, contact destination and notes. Acceptance can update the working order without overwriting this snapshot. Historical requests are not rewritten or given fabricated snapshots. Older client retry payloads remain supported.

## Persistent notifications

The existing database insert trigger creates a unique event and per-device push outbox entries in the same transaction as the request. Dispatch is server-triggered and independent of the customer's browser. A protected webhook endpoint and retry scheduler drain the existing outbox.

New per-user acknowledgement and presentation tables keep unread state and deduplicate automatic foreground alerts across sessions. A popup presentation does not acknowledge the event. Dismiss/View later, opening a record and opening an OS notification do not clear unread state. The notification button can reopen an unread request; explicit Acknowledge records the read state on the server. The inbox loads 50 unread events at a time, prioritizing events not yet presented so old dismissed alerts cannot block new arrivals; its count covers all unread events.

Incoming popups show customer contact, preferred method, submitted lines/options, quantity, unit prices, totals, notes, submission time and current status. They use the protected exact-record RPC rather than relying on the recent-record list. Contact prepares the customer's preferred channel and records preparation only; it neither sends a message nor changes status. LINE/WeChat or unsupported deep links provide copyable details for manual contact. Accept reuses the quote/confirmation panel, optional timing, instructions and audited deposit workflow. Decline requires a reason. Both decisions lock the request and compare the expected revision before using existing acceptance/decline logic.

Alerts remain queued with a visible unread indicator while a POS payment is active or another dialog is open. A push click also waits rather than navigating away from an active payment. Automatic popups do not take keyboard focus. Foreground sound offers Chime, Bell and Gentle with 1–5 repetitions, default 3. Browser audio restrictions are respected. The user-facing Test Notification control is implemented but was not invoked.

## Permissions and data

Authorized recipients are active Admins, Managers and Cashiers (the existing order-handling staff role). Kitchen, inventory and accounting roles do not gain customer-request access. Manager access is added to the pre-order page and the specific order-handling RPCs; general POS payment/refund permissions are unchanged. Workspace isolation and current authorization are checked for notification reads, decisions, registration and dispatch. Push payloads contain opaque IDs/type/language only, never private customer/order details. Device lists expose only the signed-in account's device labels/status and registration dates.

Submission does not create sales, collect payment, deduct stock or reserve inventory. Acceptance retains the existing linked scheduled-order and production path. Existing products, customers, settings, sales and historical records are not rewritten by the migration. New acknowledgements are per staff account; one staff member reading an alert does not mark it read for everyone. The service worker suppresses repeated push event IDs locally and retains unread badges until acknowledgement. Delivery remains subject to browser/OS policy and network conditions.

## Modified files

- `src/CataloguePreorders.tsx`: phone capture, submitted snapshot display, exported confirmation panels, revision-checked decisions and exact-record loading.
- `src/IncomingOrder.tsx`: new detailed incoming request panel and actions.
- `src/PersistentOrderNotifications.tsx`: persistent inbox, badges, popup queue, audio choices and device settings.
- `src/OrderNotifications.tsx`: compatibility exports for existing imports.
- `src/App.tsx`: authorized runtime roles and active-payment marker.
- `src/navigationModel.ts`: Manager pre-order access.
- `src/orderWorkflow.css`, `src/main.tsx`: theme-based responsive presentation.
- `src/translations.ts`: English keys with Spanish, Traditional Chinese and Simplified Chinese translations; product names remain untouched.
- `public/sw.js`: RC17 cache ID, persistent push retry suppression, staff-tab routing and acknowledgement-based badge behavior.
- `supabase/migrations/202610201200_persistent_preorder_notifications.sql`: additive snapshot/notification storage and guarded RPC extensions.
- Package versions, migration/release manifests, README, changelog, release notes and manual setup/deployment guides.

The existing `api/order-push.js` dispatcher is reused. Dependencies and deployment build configuration remain unchanged. Prior release reports/screenshots remain historical and are not evidence for RC17.

## Remaining setup and limits

Apply the migration before using this release. Deploy the source over HTTPS and configure Web Push keys, the protected database webhook and scheduled retry invocation. Every device must explicitly register and grant notification permission. See NOTIFICATION_SETUP.md and MANUAL_DEPLOYMENT_RC17.md.

Without the migration, the new inbox/acknowledgement/decision RPCs cannot operate. Without server push configuration, active sessions can still poll after the migration, but background OS delivery cannot operate. Custom audio requires an active app and permitted audio; it cannot be promised while the browser/PWA is closed. Installed-PWA and OS permission requirements vary by device. Device removal stops future server delivery, but already queued provider messages cannot be recalled. Existing historical events become unread until individually acknowledged; no historical request backfill is performed.

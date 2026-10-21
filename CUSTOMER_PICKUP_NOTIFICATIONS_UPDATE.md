# Customer pickup notifications — RC18

Date: 2026-10-20. Baseline: complete CounterNest Catalogue Order Workflow RC17 source.

**Source implementation only. This update has not been tested, built, type-checked, browser-validated, UAT-checked or deployed. No external websites, services, databases or APIs were accessed. No migrations were executed. Notification delivery is not claimed operational.**

## Customer experience

The existing Catalogue cart, contact, review and submission path remains. Guest customers keep their private Track Order link; no account or mandatory pickup time was introduced. Track Order now shows the existing order number, customer name, item names, variants, quantities, unit prices, customer notes, business contact/address, confirmed pickup time when present, instructions and latest update. The timeline maps existing request states to Pending Approval, Accepted, Preparing, Ready for Pickup and Collected. Declined, Cancelled and No Response remain final labels. Customer confirmation alone is not presented as staff acceptance: acceptance requires the linked scheduled order.

Totals are labeled Estimated total, Accepted quote (tax subject to final payment), or Paid total. The projection reads the existing submission estimate, accepted subtotal with current business tax, or linked sale total. It does not write prices or totals. Accepted quotes are not a guarantee of the eventual payment total.

The Ready banner includes the order number, confirmed pickup time if available, location and business contact. Track Order polls its capability-protected status RPC every 15 seconds while visible, refreshes on focus/visibility and matching service-worker messages, and retains manual refresh. This is polling with push invalidation, not a new public Supabase Realtime channel. Private order tables are not opened to anonymous realtime listeners. Offline reopening cannot fetch fresh business status until connectivity returns.

## Consent and customer preferences

The installed Catalogue shows a friendly invitation on first use or detectable installation. Not Now is remembered per catalogue on this browser. Notification Settings remains available later in the Catalogue and Track Order. If no order exists yet, the invitation explains that the customer must submit an order before subscribing; the private tracking credential is required.

The browser permission prompt is called only from the explicit Enable Notifications action, never on page load, installation or a status update. Defaults are Accepted ON, Preparing OFF and Ready ON. The settings show permission/registration state, allow saving preferences and disabling this order on this device, and explain blocked permissions and iPhone/iPad Home Screen installation. Browser, OS, secure-context and Push API support are prerequisites; support is not promised on every browser.

Each saved tracking link has its own preference area. Controls apply to that order on that device. Changing browser/OS permissions affects all origin notifications. Existing guest links remain private capability credentials: anyone given a link can read that order and manage subscriptions using that link. Do not share links publicly. Clearing browser storage removes saved links and private worker bindings; reopening the private link and explicitly enabling notifications restores the binding. No phone number or arbitrary request ID authorizes subscription registration.

## Subscriptions and server notifications

The existing root service worker and VAPID infrastructure are reused. Three minimal private tables store order-scoped devices, unique milestone events and per-device delivery attempts. Direct anonymous/authenticated table access is revoked and RLS is enabled. Capability RPCs resolve the request and workspace from the unguessable status token. Registration validates inputs and limits each order to ten subscriptions. Customer capabilities grant no staff mutation privileges.

An AFTER UPDATE trigger on the existing request creates accepted/preparing/ready events inside the status transaction. Rollbacks roll back the event. The existing scheduled-order sync trigger propagates committed operational statuses into the request. Unique request/kind events and event/device delivery keys suppress repeated button presses and status refreshes. The dispatcher leases jobs only after commit, checks the correct shop/request, current milestone, preference and workspace recovery state, and sends through the existing protected `/api/order-push` endpoint. Customers and staff do not need an open browser for server dispatch.

Transport retains five attempts within a one-day event window, five-minute abandoned-lease recovery, and removal of endpoints rejected with 404/410. A configured scheduler is required for retries. Stale earlier milestones are suppressed after the order advances. Re-entering the same milestone does not create another event. Existing historical orders/events are not backfilled; a late subscriber may receive the current milestone only if that event exists and remains within the delivery window. Persistent saved status remains available even if push fails or expires. Notification transport is best effort; OS delivery cannot be guaranteed.

The service worker stores the private tracking token locally before registration can queue a push. Payloads include event/request identifiers, milestone, business name, order number and language; they exclude customer contact, product contents, amounts and tracking capabilities. Notifications use the registered PWA icon and four-language content. Clicks resolve the private token locally, focus an exact Track Order window, reuse the matching Catalogue window if available, or open the correct tracking link. They never navigate an active internal POS transaction. Durable event markers and stable tags suppress retries; an already-focused exact Track Order view receives a refresh and visible Ready banner instead of an additional OS popup.

Subscription renewal is explicit through Enable Notifications/Save preferences after expiry or returning to the app. Browser subscription-change messages refresh settings; permission is not requested in the background. Server removal for one order does not unsubscribe the shared origin PushSubscription. Staff deregistration/sign-out similarly removes its server registration/account binding while leaving customer subscriptions intact. Existing server-side staff authorization checks still apply. Previously handed-off provider messages cannot be recalled after removal; private detail access remains capability/account protected.

## Staff workflow and data preservation

RC17 persistent staff inbox, unread badge, Contact, Accept, Decline, immutable submission snapshot and payment-safe popup queue remain included. Preferred contact methods and external-message handling are unchanged; opening WhatsApp, LINE, WeChat or other contact platforms does not mark a message sent.

Existing Scheduled Orders and Preparation actions now call a concurrency-guarded wrapper and show Ready for Pickup. The wrapper locks the existing record, checks the expected previous status, and delegates to existing transition validation and history/ledger functions. Repeating the current state is a no-op; conflicting state changes require refresh. Existing preparation eligibility, payment-before-collection and cancellation/refund protections remain. Admin, Manager, Cashier and Production roles can use the new operation where permitted by the existing record workflow; anonymous customers cannot. No new duplicate Ready button was added to the Catalogue request card: Open accepted order leads to its operational actions.

The migration is additive: no existing products, customers, requests, accepted orders, sales, payments, inventory, recipes, suppliers, purchase history, staff records, settings or audit history are rewritten/deleted/backfilled. New notifications do not deduct stock. Existing operational actions retain their established stock/payment behavior. The request's existing status history and immutable submission snapshot are retained. No replacement order records or customer identities are created by notification code.

The existing theme palette supplies Light, Dark, System and business accent colors. Tracking includes appearance/language controls and responsive layouts. Added system labels and push content support English, Spanish, Traditional Chinese and Simplified Chinese; user-entered names are not translated. Visual behavior has not been tested.

## Deployment prerequisites and limitations

Follow MANUAL_DEPLOYMENT_RC18.md. Apply the 96th migration after the RC17 baseline; deploy the updated server endpoint, frontend and worker; configure matching public/private VAPID keys, the protected customer-event webhook and retry scheduler; then customers must grant permission and register each order/device.

No new Edge Function is required. Existing Edge Functions and backend services remain part of the baseline installation. This update extends the Vercel serverless endpoint. Background display, timing, sound and installation requirements are controlled by browser/OS policy. Custom closed-app audio is neither implemented nor promised. Public web hosting alone cannot provide push without the backend configuration. New customer settings/tracking projection depend on the migration. A stale service worker may ask the user to refresh before completing registration.

Historical test/build/QA reports are retained from the supplied source solely as history. They are not results for RC18, RC17 or these changes. See MODIFIED_FILES_RC18.md for the source/document list.

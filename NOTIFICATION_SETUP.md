# Current release: RC18 customer pickup notifications

**Offline source update only — not tested, built, type-checked, UAT-checked or deployed.** No live services were accessed. Historical validation reports below/in this package do not validate this update.

Start with [Customer pickup update](CUSTOMER_PICKUP_NOTIFICATIONS_UPDATE.md) and [manual migration/deployment instructions](MANUAL_DEPLOYMENT_RC18.md). RC17 upgrades require migration 96, `202610201800_customer_pickup_notifications.sql`. Customer push also requires server configuration and explicit device permission. See [changed files](MODIFIED_FILES_RC18.md).

---

# New Order Alerts — manual backend and Web Push setup

RC17 is **not tested or build-validated**. These are manual configuration instructions; no keys were generated, no server was contacted, and no notification was sent during development.

## Database

Apply migration `202610201200_persistent_preorder_notifications.sql` after all 94 existing migrations. It adds immutable submission snapshots, per-user read acknowledgements and automatic-popup claims, exact-record reads, device management and guarded decisions. Existing insertion triggers and the outbox are reused. No customer tab is needed after submission commits.

Authorized order handlers are active Admin, Manager and Cashier accounts in the same workspace, with no required password change or pending workspace recovery. Other roles are excluded. The backend, not a browser preference, determines recipient authorization. The existing staff role assignment workflow controls who is a Manager/Cashier; this package does not change existing staff records.

## Server secrets and browser configuration

Generate a stable VAPID pair in your own trusted environment using the existing web-push tooling when ready. Do not put private keys in source control.

| Variable | Scope | Value |
| --- | --- | --- |
| VITE_SUPABASE_URL | Existing browser/server environment | Your existing project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Browser | Your existing public API key |
| VITE_WEB_PUSH_PUBLIC_KEY | Browser build | VAPID public key |
| WEB_PUSH_PUBLIC_KEY | Server only | The matching public key |
| WEB_PUSH_PRIVATE_KEY | Server only | VAPID private key |
| WEB_PUSH_SUBJECT | Server only | Maintainer mailto address or HTTPS contact |
| SUPABASE_SERVICE_ROLE_KEY | Server only | Private dispatcher key; never a VITE variable |
| CRON_SECRET | Server only | Random secret protecting the dispatcher |

Browser-build variable changes require a later deployment build. Keep VAPID keys stable; changing them requires devices to unsubscribe and register again. The provided ZIP contains no configured secrets.

## Server-triggered dispatch

After deployment, configure a Supabase Database Webhook for INSERT on `public.order_alert_events`:

- Method: POST
- Destination: `https://YOUR-DEPLOYMENT/api/order-push`
- Headers: `Authorization: Bearer YOUR_CRON_SECRET` and `Content-Type: application/json`
- The endpoint ignores webhook body data and leases delivery work from the private outbox.

Also configure a server scheduler to call the same endpoint with GET or POST and the same Authorization header, ordinarily every minute or at an interval supported by your plan. Nothing in this package creates a hosted scheduler automatically. This retry schedule handles missing webhooks, abandoned leases and transient transport failures. The customer Catalogue never invokes this dispatcher or receives its secret.

The existing dispatcher sends only to recognized Google, Mozilla, Apple and Windows push-provider endpoints. Unsupported providers fail safely. It uses leases, current role/workspace checks, per-device preferences and acknowledgement checks. Each event/device has a unique queue entry. Stable notification tags and service-worker event markers suppress retry duplicates. Generic payloads contain event/request IDs and type, not names, contacts, product lines or amounts. Authorized detail reads fetch that information after opening CounterNest.

## Per-device setup

Sign in on the HTTPS deployment as an authorized order handler. Open Settings → Notifications → New Order Alerts. Choose enabled alert types, foreground sound, repetition count (default 3), unread badge and Desktop Push/Mobile Push as applicable. Save Changes. Choose **Enable notifications on this device** to explicitly request browser permission and register. Repeat on each browser/profile/device. Device names are optional. Registered devices can be viewed and removed for the current account.

The Test Notification button is a user-operated local sound/OS-preview control, not an end-to-end transport assertion. It never requests browser permission implicitly. It was not used during this work.

## What remains inactive until setup

- Before the migration: new unread/acknowledgement, decision and device-list RPCs are unavailable; the UI reports backend/access requirements.
- After migration but before Web Push configuration: authorized active sessions can poll for persistent requests; closed/background OS push cannot operate.
- Without a valid device subscription and browser permission: that device cannot receive Web Push.
- Without a user gesture permitting audio: the foreground sound cannot play; Enable alert sound is provided.
- While a payment or other dialog is active: popup presentation and push-click navigation wait; the unread badge remains.

Foreground custom audio is available only while the app is active. Background/closed-app sound, delivery timing, installation eligibility and badges follow browser/OS policy. On devices requiring an installed PWA for push, users must install CounterNest first. No custom audio playback is promised while the browser or PWA is closed. Already accepted provider messages cannot be recalled after account/device revocation; they contain no private order details, and details remain protected by current authorization.

Notifications remain in the in-app inbox until each recipient explicitly acknowledges them. Dismiss/View later, Contact, Accept, Decline and OS notification taps do not silently mark them read. Existing historical events are available as unread; historical request snapshots are not invented or backfilled. Push transport retains the existing five-attempt/one-day delivery window; unread in-app state has no automatic one-day expiry.

# Order notification setup — RC11

The source implements delivery; no live credentials or external notification destination were configured in this task.

## Server settings

Generate one stable VAPID key pair with the installed web-push CLI (npx web-push generate-vapid-keys --json). Store the private output in Vercel's secret environment settings, never in the repository or a VITE variable.

| Variable | Location | Purpose |
|---|---|---|
| VITE_SUPABASE_URL | Browser and Vercel server | Existing project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Browser | Existing public API key |
| VITE_WEB_PUSH_PUBLIC_KEY | Browser build | VAPID public key |
| WEB_PUSH_PUBLIC_KEY | Vercel server | Same VAPID public key |
| WEB_PUSH_PRIVATE_KEY | Vercel server only | VAPID signing secret |
| WEB_PUSH_SUBJECT | Vercel server only | Maintainer mailto: address or HTTPS contact URL |
| SUPABASE_SERVICE_ROLE_KEY | Vercel server only | Private outbox dispatcher access |
| CRON_SECRET | Vercel server only | Random dispatcher bearer secret |

Redeploy after changing browser-build variables. Keep VAPID keys stable; rotating them requires device re-registration.

## Event and retry wiring

After migration 92 and the Vercel deployment, configure a Supabase Database Webhook for INSERT on public.order_alert_events. Use POST https://YOUR-DEPLOYMENT/api/order-push with Authorization: Bearer YOUR_CRON_SECRET and Content-Type: application/json. The request body is ignored; never put the secret in a URL. The database transaction creates device delivery rows alongside the event.

Also schedule a protected GET or POST to the same endpoint every minute (or a supported operational interval) using the same bearer header. Use a scheduler supported by your deployment plan; no paid plan is selected automatically. This drains backlogs/retries when a webhook fails. No scheduler is active merely from deploying the ZIP.

The dispatcher leases up to 50 rows for five minutes with SKIP LOCKED. It rechecks active staff, current shop, temporary-password state, customer-service role, per-device choices and pending workspace deletion. Requests are queued once per event/device; OS notifications use stable tags and Web Push topics. A crash after sending but before acknowledging can retry; replacement tags suppress repeat notification identity. Transient failures retry after the lease, up to five attempts within one day. Inspect private delivery state/last_error in Supabase for failures. HTTP 404/410 removes expired devices; invalid/provider-authorization failures stop retries. The protected endpoint returns aggregate counts, without keys or customer information. Add an operational retention job for old alert/delivery rows if required by your retention policy; RC11 does not erase historical events automatically.

Only recognized Google, Mozilla, Apple and Windows push-service hosts are sent requests. Other endpoints fail safely. Private subscriptions and queue tables have no browser table policies/grants. Only role-checked RPCs expose registration or same-shop minimal events. Push payloads carry type, event ID and record ID, without customer names/items/prices. Subscriptions are deliberately excluded from workspace exports and are not restored into another business.

## Register and test

Sign in as Administrator or Cashier on HTTPS. Open Settings → New Order Alerts. Choose alert types, sound/repeat, Desktop Push or Mobile Push and badge. Save Changes, then Register this device and accept the browser permission prompt. Each browser/profile/device registers separately (20 per account limit). Test Notification checks the local foreground sound and, if registered/permitted, a local OS notification. It is not an end-to-end transport test.

Send a disposable catalogue/pre-order/custom-cake request from another device in staging. With the POS focused, verify popup, badge and three two-note rings after a tap enables audio. With the POS backgrounded/closed, verify an OS notification, correct record after sign-in, and lease acknowledgement. Foreground polling is every five seconds while visible and uses a server-time composite cursor. Sound requires an initial user gesture; multiple tabs use a bounded shared event list and Web Locks where supported.

Sign out unregisters the active device and clears the worker's persisted account binding. Service-worker delivery checks that binding, including after browser restart, and will not show another account's event. Revoking staff or freezing a workspace excludes new dispatch leases. Already accepted messages at an OS push service cannot be recalled; the worker binding and original record authorization still apply.

## Platform limits and sources

The custom three-ring sound is a foreground feature. Fully closed/background sound, badges, delivery timing and install support follow browser/OS policy; a notification cannot guarantee a custom sound on every OS. Physical iOS/Android/Windows acceptance is still required. The shell stays installable; no offline financial transactions are added.

Implementation references: [web-push library](https://github.com/web-push-libs/web-push), [PushEvent](https://developer.mozilla.org/en-US/docs/Web/API/PushEvent), [showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification).

Device registration saves the current system language for background titles (English, Spanish, traditional or simplified Chinese). Save/update the device after changing language. Foreground text follows the current UI language immediately.

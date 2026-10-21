# Manual installation and deployment — RC18

These are instructions for a future authorized deployment. Nothing here was executed. The source has not been tested, built or deployed.

## 1. Preserve the existing installation

Keep a backup of the current source and database using the existing documented backup process. Use the supplied complete source ZIP as the update; do not reset the database, seed over existing business data or rerun applied migrations. Historical migration files are included for complete fresh installations, not as a request to reapply them to production.

## 2. Supabase migration order

For a database already at RC17 (95 migrations), apply only `supabase/migrations/202610201800_customer_pickup_notifications.sql` as migration 96 through your normal migration process. It depends on `202610201200_persistent_preorder_notifications.sql` and all earlier migrations. For older installations, apply only missing migrations in MIGRATION_MANIFEST.json order. Fresh installations follow all 96 migrations plus the existing initial setup documentation. Do not run only the final migration on an empty database.

The RC18 migration creates three private customer-push tables and RPCs, wraps the existing status read, attaches a request status-event trigger and adds guarded staff transitions. It is transactional and intended to run once through migration tracking. Do not manually rerun it after successful application. It has no historical data backfill. Existing authenticated role/workspace guards, audit history, sales and inventory logic remain required. No customer table is exposed through permissive RLS policies.

No additional Edge Function is introduced. Preserve/deploy baseline Edge Functions per EDGE_FUNCTIONS.md when setting up a fresh installation. Apply the database migration before releasing the updated frontend and dispatcher.

## 3. Web Push and hosting variables

Use the existing stable VAPID key pair, or generate one in your own trusted deployment environment when ready. Do not commit private keys. Configure these in the hosting environment:

| Variable | Placement |
| --- | --- |
| VITE_SUPABASE_URL | Existing public Supabase project URL used by browser/server |
| VITE_SUPABASE_PUBLISHABLE_KEY | Existing browser-safe publishable key |
| VITE_WEB_PUSH_PUBLIC_KEY | Browser build, public VAPID key |
| WEB_PUSH_PUBLIC_KEY | Server, same public VAPID key |
| WEB_PUSH_PRIVATE_KEY | Server secret only |
| WEB_PUSH_SUBJECT | Server, maintainer mailto or HTTPS contact |
| SUPABASE_SERVICE_ROLE_KEY | Server secret only, never a VITE variable |
| CRON_SECRET | Server secret protecting dispatcher requests |

Retain existing other environment variables required by CounterNest. Do not put `.env`, service-role credentials or the private VAPID key into GitHub/source ZIP. A changed browser build variable needs a new hosting build. Rotating VAPID keys invalidates existing subscriptions; plan explicit device re-registration. The current code intentionally keeps shared browser subscriptions when disabling one order, so key rotation may require clearing the origin's old push subscription through browser settings before re-enabling all desired registrations.

## 4. GitHub and Vercel manual deployment

Extract the complete ZIP into a local source folder. When you are ready to use external systems, upload/commit the source to your intended existing GitHub repository with normal access controls. Preserve repository history and exclude local secrets, node_modules, dist, generated credentials and private keys. This work did not contact or modify GitHub.

Use the existing Vercel project and Vite settings: project root containing package.json, the existing build script, and `dist` output. Retain `vercel.json` routes and API files. Configure the above environment variables for the intended environment and deploy the frontend, `api/order-push.js` and `public/sw.js` together after the migration. Dependency installation and hosting builds are future deployment steps, not steps performed in this task. No lockfile dependency versions were intentionally changed.

HTTPS is required. Serve `/sw.js` from the same origin with its existing root scope. Do not cache that script permanently at a proxy. Existing manifest/PWA icons/install behavior are retained. Customers with an older active worker may need to refresh/reopen the PWA before enabling notifications; a failed binding handshake reports this instead of registering an unusable tracking link.

## 5. Server-triggered dispatch and retries

Keep the RC17 Database Webhook for INSERT on `public.order_alert_events`. Add a separate Database Webhook for INSERT on `public.customer_order_notification_events`:

- Method POST, destination `https://YOUR-DEPLOYMENT/api/order-push`.
- Authorization header `Bearer YOUR_CRON_SECRET`.
- Content-Type `application/json`.
- Store the webhook secret securely; never expose it to the browser.

The endpoint ignores the webhook body and leases eligible rows from both private queues. Add/retain a server scheduler calling the same endpoint with GET or POST and the same Authorization header, typically every minute or the interval your plan supports. This package does not create a hosted cron job automatically. The scheduler also picks up subscriptions registered after an event and jobs left by failed/lost webhooks. Five-minute leases, five attempts and a one-day event window apply. An unavailable customer queue is reported as `customerQueueAvailable: false`; staff queue handling remains in place.

Only the existing supported Google/Mozilla/Apple/Windows push providers are allowed by the dispatcher. A provider accepting a request is not proof that the OS displayed it. Public payloads intentionally omit private tracking credentials and customer/order contents.

## 6. Customer and staff device setup

Customers open their existing private Track Order link, choose notification preferences and explicitly tap Enable Notifications. They may also use Catalogue Notification Settings for saved orders. Permission must be granted; a server configuration cannot override a denied browser or OS permission. On iPhone/iPad, follow the displayed Safari → Share → Add to Home Screen guidance and open the installed app where push is supported. Android and desktop support also depend on browser/OS versions and settings. Not Now persists until the customer chooses settings later.

Every order/device registration is scoped independently. Expired subscriptions can be renewed using Enable Notifications; 404/410 endpoints are removed server-side. Clearing site storage removes private deep-link mappings and saved tracking links; retain the private link if you need to reopen it. Re-enable from that link to restore local mapping. No account is required. Staff continue using Settings → Notifications → New Order Alerts as described in NOTIFICATION_SETUP.md.

## Awaiting configuration

The enriched tracking RPC, customer registration and staff transition wrapper require migration 96. Background/closed-app push additionally requires the deployed dispatcher/worker, VAPID keys, webhook/retry schedule, network access and an explicitly permitted device subscription. Automatic invitations depend on installation detection/standalone support. Active tracking uses 15-second visible-page polling and worker messages; manual refresh remains available. Offline status cannot be updated without connectivity. No customer push is sent to non-subscribers. No custom closed-app sound is promised.

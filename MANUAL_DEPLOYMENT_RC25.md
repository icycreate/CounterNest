# RC25 manual migration, Storage and deployment instructions

These instructions were not executed against external systems. The source was built and tested locally only.

## Preserve the installation

Back up the current source, full database schema/data and Storage objects. Keep a copy of the currently deployed frontend. Do not reset/seed the database or replace product/customer/history records. Inspect the target migration history before doing anything. The existing app export is not a substitute for a complete backend and Storage backup for this release.

## Database order

- Already successfully at RC24 (100 migrations): apply only `supabase/migrations/202610251600_independent_catalogue_editors.sql`.
- RC24 recognition migration failed and rolled back: apply the corrected `202610251000_customer_recognition.sql` first, then migration 101. The correction normalizes CRLF in a guarded function-body replacement. Check the migration history and existing function definitions if an earlier manual attempt partially ran; do not blindly rerun a successful migration.
- Older or fresh installation: apply only missing migrations in `SUPABASE_MIGRATION_ORDER.md` order. There are 101 files, with hashes in `MIGRATION_MANIFEST.json`.

Use your normal migration tool with transaction handling. Migration 101 is transactional and intended to be recorded/applied once. Columns/bucket creation is partly idempotent; policy creation and function renames are not rerunnable without migration tracking.

It extends existing customer_display_configs/categories, creates protected save/read RPCs, two private media buckets, validation/write guards, notification read-all RPC, inbox metadata wrapper and a scoped Realtime SELECT policy. It adds order_alert_events to supabase_realtime only when that publication exists. Verify that publication in the target if live updates are wanted; five-second active-session polling remains available.

## Storage

Migration 101 creates private `catalogue-home` and `catalogue-categories` buckets with JPEG/PNG/WebP and 12 MiB limits. Paths begin with the workspace ID. Authenticated admins can insert immutable objects in their workspace. Public access is limited by a published-reference predicate; admins can read their own unpublished objects. There is no client overwrite/delete policy. Do not make these buckets public or add broad write policies.

Retain existing `catalogue-about`, product-media and branding buckets/policies. Confirm hosted upload size/type checks and signed URLs in staging. Removing an image in an editor changes only its published reference; it does not delete the stored object.

## Build and hosting

On an authorized deployment machine, use Node supported by package.json (22.12+ below 25), install locked dependencies with `npm ci`, then `npm run build`. Keep the existing Vite configuration, `vercel.json`, `api/` and `public/sw.js`. Output is `dist`. The archive intentionally excludes dependencies, compiled output and private environment files.

For GitHub, review the extracted source against the existing repository, commit through your normal process, and keep secrets/node_modules/dist out of source control. For Vercel, retain the existing project/root, set the browser-safe build variables and server secrets separately, then deploy after migrations succeed. No repository or hosting settings were changed in this task.

Browser: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (or supported legacy anon key), optional VITE_PUBLIC_APP_URL, and VITE_WEB_PUSH_PUBLIC_KEY. Keep VITE_ENABLE_DEMO false in production. Never place service-role or VAPID private keys in VITE variables.

Server push: retain SUPABASE_SERVICE_ROLE_KEY, WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY, WEB_PUSH_SUBJECT and CRON_SECRET. Public/private VAPID keys must match the existing registered devices; rotating them requires device re-registration. Retain other existing application secrets and Edge Functions.

## Server-triggered notifications

Deploy the existing `api/order-push.js` dispatcher with the frontend/service worker. Keep the authenticated INSERT webhook for public.order_alert_events pointing to `https://YOUR-APP/api/order-push` with `Authorization: Bearer YOUR_CRON_SECRET`, and the existing customer_order_notification_events webhook if customer status push is used. Retain an authenticated scheduler/retry mechanism as described in MANUAL_DEPLOYMENT_RC18.md. Do not expose dispatcher secrets in the browser.

The transaction creates the order event independently of the customer's browser. Database persistence and foreground polling can work without push, but background notifications cannot operate until the dispatcher, delivery triggers/retries, credentials, HTTPS and recipient subscriptions are configured. Use Settings → Notifications → Enable notifications on this device explicitly; permission must not be requested automatically. OS rules control closed-app notification sounds.

## LAN and PWA

Retain browser/LAN hosting; no Electron or installer is required. Ordinary browsing can use existing LAN hosting. Push, service workers and install behavior require a supported secure context (HTTPS, with localhost exceptions). A plain remote LAN HTTP origin does not provide full PWA/push capability. Serve /sw.js with its existing root scope and refresh/reopen installed apps for the RC25 cache version.

## Post-deployment manual acceptance

Sign in as admin, save each editor, sign out/in and refresh the public token URL. Check languages and media independence. Try unauthorized/other-business accounts. Submit one request twice with the same client ID; confirm one request/event. Check another active staff session, mark read/all-read, exact-record opening, Contact/Accept/Decline and payment-modal deferral. Test browser permission denial, registered device removal, background push and physical mobile/tablet layouts. Verify original product photos, stock, sales and custom logos.

## Rollback

If migration 101 fails inside its transaction, roll it back and investigate; do not mark it applied. After successful publication, prefer a reviewed forward correction. Reverting the frontend to RC24 can leave the additive schema/media in place; it will not expose the new editors. Do not drop columns, delete media or reverse function renames in a live system without a separate reviewed rollback and backup. Already saved content should be retained for recovery.

## Reproduce local checks

`npm run build` performs TypeScript checking and the production build. `npm run test:database` runs the existing database regression suite; `npm run test:rc25` runs the new focused suite. `npm run test:release` checks the release inventory. These use installed local dependencies.

`npm run test:rc25:browser` requires Playwright and an installed Chromium/Edge executable. If Playwright is provided outside this project, set COUNTERNEST_PLAYWRIGHT_MODULE to its module directory; set COUNTERNEST_BROWSER to the browser executable if the default Windows Edge path does not apply. The test intercepts its local fixture URL and blocks other page requests; RPC/Storage are mocked. It writes tests/rc25-browser-results.json. Installing missing dependencies is a separate authorized setup step. The full legacy npm test chain still has the failures listed in RC25_CHANGE_REPORT.md.

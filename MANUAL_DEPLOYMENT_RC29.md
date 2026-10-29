# RC29 manual migration, configuration and deployment

These are instructions for a later authorized deployment. No live database, website, GitHub repository, Vercel account, push provider or external API was accessed during this work.

## Before deploying

Review RC29_PHASE56_REPORT.md and the six unresolved legacy test groups. Complete the staging checklist before production rollout. Back up source, database and Storage through the established backup process. Do not reset, reseed, replace or import demo data into an existing business.

The source continues RC28. Compare your installation's recorded migration history before proceeding. Preserve all private environment settings separately from this ZIP.

## Database upgrade from RC28

Apply these four files manually, in order, using a trusted administrative migration session:

102. `202610271900_productivity_drafts_setup.sql` — private drafts, registration text/logo recovery, the private account-owned `onboarding-assets` bucket, and resumable setup progress.
103. `202610272000_search_media_history.sql` — serialized company bootstrap, category search, publication history and media organization/removal protections.
104. `202610272100_optional_requested_time.sql` — optional requested pickup time in the existing canonical submission payload and immutable snapshot.
105. `202610281000_setup_preferences.sql` — business setup preferences, enabled POS methods, checked staff-note updates and defaults for never-published catalogue content.

The existing 101 files must already be present in the recorded history. For a fresh installation use the complete SUPABASE_MIGRATION_ORDER.md. Do not rerun completed migrations. Several migrations intentionally verify and wrap exact predecessor functions; a mismatch stops the transaction instead of guessing. Use MIGRATION_MANIFEST.json to compare file SHA-256 values.

These scripts add tables, functions, policies and triggers; they do not seed sales, deduct stock, reset business data or rewrite historical order snapshots. They use the existing Supabase auth, Storage and workspace helpers. Local PostgreSQL-compatible execution is not a substitute for staging verification on the target Supabase version.

Keep the existing private `catalogue-home`, `catalogue-categories` and `catalogue-about` policies. Product/logo uploads continue through their existing buckets/editors. Do not make a bucket public to resolve an upload error. Verify direct table/RPC/Storage authorization with two separate workspaces and non-admin accounts.

## Manual GitHub and Vercel steps

1. Extract the complete ZIP into a review directory. Review the diff against your existing repository; consult MODIFIED_FILES_RC29.md. Keep `.env` and secret files out of source control.
2. Commit the reviewed source and lockfile through your normal GitHub workflow. No branch, commit or pull request was created by this task.
3. Use the existing Vercel project and browser-based architecture, `vercel.json`, `api/` routes and rewrites. Preserve Node requirements from package.json. On an authorized machine run `npm ci`, then `npm run build`; output directory is `dist`. Dependencies were not downloaded during this offline work.
4. Preserve browser-safe `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (or the existing anon-key alternative), canonical URL and public push key. Keep service-role, private VAPID and dispatcher secrets server-only. Never prefix a private secret with `VITE_`.
5. Deploy to staging first, verify all existing business workflows and the checklist below, then use your normal production approval process. Install no Electron/Capacitor/native package; this remains a browser/PWA deployment.
6. Verify the service worker serves the new `rc29-productivity-recovery` cache version and that reopening the installed PWA loads RC29. Do not cache private API responses or tenant data in the app-shell cache.

## Existing Web Push setup remains required

Retain the existing `NOTIFICATION_SETUP.md`, `MANUAL_DEPLOYMENT_RC17.md` and `MANUAL_DEPLOYMENT_RC18.md` transport instructions. Their old release-status banners are historical; RC29 validation is recorded separately.

- Browser build: `VITE_WEB_PUSH_PUBLIC_KEY`.
- Server only: `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` and the existing project URL configuration.
- Configure the existing INSERT webhook on `public.order_alert_events` to POST to `/api/order-push` with the dispatcher Authorization header, plus the existing authenticated scheduler retry path.
- Keep server recipient/workspace authorization and private outbox leases intact. The customer does not need to leave the Catalogue open after the server commits a request.
- On each authorized staff device, explicitly choose Enable notifications on this device. Permission must not be requested on page load. Verify the registered-device list and removal.

Until the database, HTTPS hosting, VAPID keys, dispatcher/webhook/scheduler and explicit device permissions are configured, hosted persistence and background OS notifications cannot be verified or promised. Closed-browser custom audio is not supported or promised. Foreground sound requires browser audio permission and an active session. Contact links do not prove that WhatsApp/LINE/WeChat messages were sent.

## Staging acceptance checklist

- Create a test business; save text registration progress; resume. Complete the seven stages through the existing editors. Verify ordinary existing accounts are not forced into setup.
- Set business type/default language and POS methods. Verify new content uses the default while existing translations and personal language preferences remain unchanged.
- Edit all three catalogue sections independently, autosave, close/reopen, simulate a failed save, compare another admin's draft, restore history into a draft, and publish deliberately.
- Edit a product while stock changes elsewhere: verify stale product edits are rejected and stock is never overwritten by the product form.
- Upload/crop/reuse media; verify originals, purposes, usage labels, referenced-file protection and failed Storage-delete recovery. Verify another workspace cannot list, use or remove these assets.
- Submit a request with and without a requested time; retry the same request after losing its response. Verify one request, one corresponding event, unchanged stock, exact-record notification links and Contact/Accept/Decline.
- Check internal-note conflicts and request search/date filters. Confirm accepted production/fulfillment/payment still uses the existing ledgers.
- Complete a checkout, disable its method, then recover its original checkout reference. Verify the original receipt is returned and new charges using that method are rejected.
- Test server-unreachable versus browser-offline status. Do not queue/replay financial mutations offline.
- Use keyboard-only navigation, all four languages, Light/Dark/System, reduced motion, 200% browser zoom, 390px mobile and tablet layouts. Check real screen readers, iOS/Android PWA installation and real push delivery separately.
- Confirm tutorial video playback and English captions without voiceover remain available.

Rollback the frontend to the backed-up release if needed. Do not drop new tables or reverse migrations on a live database without an audited recovery plan. A frontend rollback does not undo deliberate publication or business transactions.

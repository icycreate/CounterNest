# Android push backend readiness — 2026-11-01

## Verified remotely (read-only)
Firebase counternest-82288 contains Android app com.counternest.pos, sender 677228450801. Firebase Cloud Messaging HTTP v1 is enabled; legacy API disabled.
Production Supabase onfhqlsovqkwrmjuuauy has the existing order event/device/delivery tables, but no Android transport migration or Android Edge Functions. Existing pre-order and email functions remain deployed unchanged.

## Changes in this update
- Registration and test preparation require a live, unexpired auth session. Worker claims also enforce session expiry and device push/pre-order preferences.
- Migration grants are committed in the same transaction as the schema changes.
- Dedicated ANDROID_PUSH_WORKER_KEY authenticates the dispatch endpoint; absent/incorrect credentials fail closed before privileged database access. Never reuse a service-role/database key for this credential.
- Disabled-by-default GitHub scheduled retry workflow calls only that restricted endpoint. Immediate submissions continue to start a bounded drain in Supabase; retries use the durable existing outbox.
- No Android UI/session changes, pg_net, Vercel relay, historical backfill, inventory changes, or email changes.

## Executed local checks
PASS TypeScript (npm run typecheck).
PASS Android Gradle assembleDebug --offline, 246 tasks, 6 executed; existing flatDir warnings.
PASS all 107 migrations in local PGlite, nine Android security groups, including separate synthetic businesses, disabled business, foreign event suppression, expired/deleted session, replay, stale leases, retry and invalid-token cleanup.
PASS worker payload/gates/retry/bounded-drain checks and dedicated credential acceptance/rejection.
PASS eight mocked email-handler groups and frontend filter/UUID checks.
These are local checks, not live Google OAuth/FCM or production authorization tests.

## Concrete proposed rollout (requires owner approval)
1. Apply supabase/migrations/20261031185957_android_push_v64.sql to the existing project after backup verification. No historical records are rewritten except pending Android work cancellation when controls are disabled.
2. Deploy android-push, android-push-test and the reviewed submit-preorder function including its existing email dispatch. Do not change send-preorder-email or its secrets.
3. Securely configure FIREBASE_SERVICE_ACCOUNT with a service account from counternest-82288 authorized to send FCM messages. Store private JSON only in Supabase secrets, never this repository/APK/chat. Set FCM_PROJECT_ID=counternest-82288. Initially set ANDROID_PUSH_ENABLED=false.
4. Generate a random dedicated ANDROID_PUSH_WORKER_KEY (at least 32 characters); store it in Supabase and the matching GitHub Actions secret only. GitHub needs no Firebase credential or Supabase database key. Keep repository variable ANDROID_PUSH_RETRY_ENABLED unset/false until rollout approval.
5. For controlled device tests, enable the global flag while business settings remain off. Register the signed-in phone through its explicit Enable Push action, then use the admin-only current-device test. No actual receipt has yet been verified.
6. After authorization tests, enable only the selected test business for controlled catalogue pre-orders. Verify foreground, minimized, removed from recents and locked states, authorized tap navigation, opt-out, replay and two real business accounts. Keep synthetic tests clearly labelled and preserve audit history.
7. Production retry scheduling requires this workflow on the default branch and ANDROID_PUSH_RETRY_ENABLED=true. PR merge needs separate approval. GitHub schedules can be delayed and are not a guaranteed five-minute service; monitor backlog/failed attempts. Each invocation drains at most five jobs. Do not call rollout complete without operational retry scheduling.

## Remaining limitations
No production changes or new private keys created in this update. No real FCM receipt, live two-account isolation, phone-state scenarios or tap tests completed. Backend credentials and deployment require owner action/approval. FCM delivery is at-least-once; outbox leases and native event-ID deduplication mitigate duplicates, but provider acceptance followed by a lost acknowledgement can cause a resend. Do not promise exactly-once transport. Android force-stop differs from removing recent apps and can prevent delivery until reopening.
Build 60401 already has the matching RPCs and native notification handler; these backend-only changes do not require reinstalling/rebuilding the APK. The Android build was run for validation only.

## Production deployment — 2026-11-02 (approved)
Applied android_push_v64 through Supabase migration tooling to onfhqlsovqkwrmjuuauy.
Deployed android-push v1, android-push-test v1, submit-preorder v2.
Compared the existing deployed email handler/provider/readiness/dispatch and submission handler against local sources: identical. send-preorder-email was not redeployed.
Live checks: worker missing credential 401; worker incorrect credential 401; device test missing user JWT 401; empty catalogue payload 400 with no order created.
Database verification: zero enabled Android businesses, zero registered Android devices, empty worker claim; all eight Android functions deny anon execution, claim/finish deny authenticated execution; both new tables have RLS and deny direct anon/authenticated SELECT. All new functions have fixed pg_catalog,public,pg_temp search paths.
Advisors report expected RLS-without-policy information for two private tables and authenticated SECURITY DEFINER warnings for five intentionally authorized RPCs. No new anonymous Android function exposure. Pre-existing unrelated advisory findings remain unchanged; this is not a clean security audit of the entire application. References: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy and https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable.
Server secret configuration has been requested securely; values were not read or exposed. ANDROID_PUSH_ENABLED=false was requested but its environment value has not been independently verified. Business-level delivery remains disabled. No real FCM send or phone receipt has been tested. No PR merge or scheduled retry activation.

## Real-device result — 2026-11-03
The owner configured the Firebase service account and server secrets directly. Initial native test calls returned 503 with no attempt created. After configuration verification, an actual test was accepted by Firebase: android_push_attempts state sent, created 2026-11-03 13:14:44.282964 UTC (07:14:44 Belize), finished 13:14:44.857 UTC, provider ID present. No credential values were inspected.
ADB confirmed the Samsung device was authorized. Device registration is active for Mrs. Su kitchen, push=true and auth session valid. Zero businesses enabled at verification.
Actual phone notification tray contained “CounterNest — Test notification” and “Android push is working on this device.” Tapping that notification opened CounterNest Settings with the existing Mrs. Su kitchen administrator session intact. This establishes real FCM receipt and the test-notification route, not authorization for a particular pre-order.
Still pending: controlled catalogue pre-orders, foreground/minimized/removed-from-recents/locked state matrix, exact order tap authorization, two real business accounts, live retry/invalid-token tests and scheduled retry activation. The receive-time app state of the first observed notification was not independently established; do not count it as a passed state-matrix scenario. Approval requested for four labelled catalogue test requests and temporary business enablement, followed by disabling again. No APK reinstall, new production code or business enablement performed for this test.

## Controlled catalogue tests in progress — 2026-11-03
Owner approved four labelled Mrs. Su kitchen catalogue requests, temporary Android business enablement and restoration to off afterward; selected Chubbylu Bakes for subsequent isolation checks.
Business push was enabled through the existing signed-in administrator UI (revision 2). Baseline Tamales stock: 21.000. Requests use one Tamales at BZD 3.00, reserved fictional US number +12025550147 and explicit do-not-prepare/contact/charge notes; pickup time left blank.
Test 1 foreground: request #18, record a35a9bd1-570e-4ce7-8ec0-017112fb972a. ADB verified CounterNest as current focus before submission. Actual incoming-order popup displayed customer label, notes, quantity/price and Contact/Accept/Decline/Open record/Acknowledge actions. Android delivery sent in one attempt; request remains new_request.
Test 2 minimized: request #20. After ADB authorization became unavailable, owner explicitly confirmed minimized and unlocked before submission, then confirmed notification receipt and opening the exact request #20. Server delivery sent in one attempt; request remains new_request. This scenario is user-observed, not ADB-observed.
An unrelated request #19 appeared during testing and is excluded from these controlled results; it was not created or modified by the assistant.
Tests 3/4 and real cross-business checks remain pending. Do not activate general rollout based on these partial results.

## Four-scenario results and restoration — 2026-11-03
Test 3 removed from recent apps: owner confirmed removal (not Force stop) before catalogue submission #21, then confirmed notification receipt and exact request #21 opening.
Test 4 locked phone: owner confirmed locked before submission #22, then confirmed receipt while locked and exact request #22 opening after unlocking.
All four controlled requests (#18, #20, #21, #22) remain new_request; each Android delivery is sent with attempts=1. Stock is still 21 Tamales. Business enabled restored to false, revision 3; enabled-business count verified zero. No additional test requests were submitted. No staff contact/accept/decline actions were taken.
Production database authorization checks used SET LOCAL ROLE authenticated with the two existing admin claim contexts inside rolled-back transactions: Chubbylu cannot retrieve Mrs Su request #22 (Request unavailable) or see Mrs Su alert events; Mrs Su can retrieve #22 and cannot see Chubbylu events. These are actual database permission checks with simulated claim contexts, not proof of a second real device session. Awaiting owner sign-in to Chubbylu on the phone for device rebinding and negative tap test.

## Owner-requested closeout — 2026-11-03
Owner asked to skip Chubbylu phone testing for now and finish Mrs. Su. No second-business phone sign-in/rebinding/negative native tap result is claimed.
Mrs. Su acceptance evidence: four catalogue requests persisted, four single-attempt provider successes, directly observed foreground popup, owner-confirmed minimized/removed/locked receipts and exact order navigation. Initial standalone FCM receipt and test tap were directly observed. Android build 60401 retained throughout.
Automatic rollout remains OFF at business level, as agreed. Global server enable is configured for test capability. The disabled GitHub retry workflow is only on the draft branch; operational retries require approved default-branch merge, dedicated Actions secret and explicit variable enablement. GitHub schedules can be delayed. Do not describe the system as fully activated or all requested security/UAT complete.
Remaining: live second-business device test, live failure recovery/invalid-token/duplicate replay tests (local tests passed), scheduled retry activation, release signing if a distributable release is needed. Existing historical audit results remain above; later dated results supersede earlier pending statuses. No private credential values are in this report.

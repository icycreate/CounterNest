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

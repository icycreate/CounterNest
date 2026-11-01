# CounterNest Android 6.4 — implementation and rollout

Date: 2026-10-31 (Belize). Base: CounterNest 6.3A, commit 2bf684835aad4dd445ebd77522d3db5c12f2b9a2.

## Status

Implemented locally: Capacitor Android project, bundled React UI, Firebase configuration, Android Keystore session storage, native Back/deep links, explicit notification permission, native background notifications, device registration/revocation, per-business controls, FCM HTTP v1 worker, protected outbox leases and audit records, four-language labels, and APK builds. Backend changes are NOT deployed or enabled. Existing 6.3A email services/credentials remain unchanged. No 6.3B, pg_net, Vercel relay or scheduler was introduced.

Application: com.counternest.pos, versionName 6.4.0, versionCode 60401, Firebase project counternest-82288. The supplied google-services.json matched this project/package and was integrated locally. It is excluded from Git and the distributable source ZIP; restore your existing downloaded file to android/app/google-services.json when rebuilding. It is Firebase client configuration, not a server service-account credential.

## Build and install

Use Node 22.12+ (below 25 per existing project policy), JDK 21, Android SDK 36, and the included Gradle 8.14.3 wrapper. Set JAVA_HOME to your JDK 21 directory. The app uses AGP 8.13.0, Google Services plugin 4.4.4 and Firebase Messaging 25.0.1, aligned with the Capacitor push plugin. Android 7/API24 or newer is required.

1. Run npm ci in the project root.
2. Restore the supplied google-services.json to android/app/google-services.json.
3. Configure only VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (public client key) and VITE_ENABLE_DEMO=false in your local build environment. Never use service-role/secret keys in VITE variables.
4. Run npm run android:sync. This builds the bundled web app, prepares Android-only viewport insets, and synchronizes Capacitor. Regular npm run build preserves the browser/PWA viewport.
5. Open android/ in Android Studio, or run android/gradlew.bat :app:assembleDebug :app:assembleRelease with android/ as the working directory.
6. Debug output: android/app/build/outputs/apk/debug/app-debug.apk. Release output: android/app/build/outputs/apk/release/app-release-unsigned.apk.

The debug APK is signed with the local Android debug key and is installable for testing. The release candidate is UNSIGNED and cannot be installed until signed. No release keystore has been created or committed. Use Android Studio's Generate Signed Bundle/APK workflow with an owner-controlled release keystore, securely back it up, and retain that same key for future updates. Never place its password or private key in Git. Verify the resulting APK using Android SDK apksigner before distribution.

For USB installation, authorize the computer on the phone and use adb install -r CounterNest-v6.4-debug.apk. For manual installation, transfer the debug APK through a trusted channel and allow installation from that selected source when Android prompts. Launch CounterNest, log in with an existing account, then enable notifications explicitly under Settings. A release APK signed with a different key cannot replace a debug install directly; preserve required local data and coordinate uninstall/reinstall instead of silently deleting it.

## Backend activation — review and authorization required

No commands in this section have been executed against production for this release.

1. Review and back up the existing database. Review supabase/migrations/20261031185957_android_push_v64.sql against the deployed 6.3A baseline. The migration adds native transport columns to the existing device/delivery tables, a company-preference table, an attempts audit table, narrow RPCs and an Android enqueue guard. It updates the Web Push lease to exclude Android jobs. It fails explicitly if that existing lease definition differs. It does not backfill notifications, delete history, deduct inventory, or change email tables.
2. Apply that single reviewed migration using the existing migration process. Do not blindly push unrelated local migrations.
3. In the EXISTING Firebase project counternest-82288, ensure Firebase Cloud Messaging API (HTTP v1) is enabled. A server-only service account needs cloudmessaging.messages.create in this project (for example the Firebase Cloud Messaging API Admin role). Store its JSON securely as FIREBASE_SERVICE_ACCOUNT in Supabase Edge Function secrets. Do not upload it to this repository or the APK. Configure FCM_PROJECT_ID=counternest-82288. Keep ANDROID_PUSH_ENABLED=false initially.
4. Deploy android-push and android-push-test with the included config.toml settings. verify_jwt=false is paired with explicit @supabase/server authentication: android-push requires secret authentication; android-push-test requires a user session and a scoped admin-only preparation RPC. Never remove these wrappers. Deploy submit-preorder with its added independent Android drain; retain the existing email dispatch and all its secrets. No Vercel deployment is needed for the APK itself.
5. Add the exact counternest://auth/callback redirect to Supabase Auth's allowed redirect URLs. Native reset uses PKCE; test the reset link on the same device that requested it. A custom scheme is not an Android verified App Link; PKCE prevents an intercepted code from being exchanged without the originating verifier.
6. With company push controls still OFF, enable ANDROID_PUSH_ENABLED=true solely for controlled testing. Register an authorized device through the app and use Test Notification. This explicit admin test does not require enabling automatic company order alerts. The test is limited to the requesting user's registered device, at most once per two minutes.
7. Verify permission denial, foreground, background, lock-screen, notification tap, logout and account switching on the physical phone. Verify unauthorized Edge requests are rejected and that tokens never appear in UI or response bodies.
8. After approved acceptance testing, enable Enable Push Notifications and New Pre-order Alerts for the intended business only. Submit one clearly labeled controlled catalogue request and verify one saved request, one event/job per eligible device, provider acceptance and actual phone receipt/navigation. Do not claim provider acceptance alone proves delivery.

## Delivery and security model

The public catalogue uses the existing validated submit-preorder path. The database transaction creates the request and existing notification event/outbox entries. EdgeRuntime.waitUntil starts a bounded drain after commit independently of email. Disabling a business prevents Android jobs for new events and cancels unsent Android jobs; it cannot retract a push already handed to FCM. Historical/disabled events are not replayed on enable.

Workers use service-only claims with SKIP LOCKED and random, expiring lease tokens. Acknowledgments reject stale leases. Five attempts maximum, exponential retry delay, one-day event cutoff. The existing Web Push worker cannot lease Android rows. Sender eligibility rechecks company, role, active staff, password-setup status, workspace recovery state, device revocation and the original Supabase session. Registration derives company/user from the authenticated caller, not supplied company IDs. Ordinary API roles cannot read raw tokens or delivery audit tables. Test preparation returns metadata only; the authenticated Edge retrieves the token server-side.

FCM data payloads contain event/order/user identifiers and generic localized text, without customer contacts, prices or business secrets. The Android service checks its locally active user binding before showing a private OS notification. Logout clears that binding and visible notifications even if the server revocation request fails; deleted/invalidated sessions also prevent future claims. Offline revocation is not guaranteed immediately on the backend; re-register on next login. An already accepted message can race with revocation, so native binding and authorized order lookup are additional protections. Taps validate the current user and get_order_request_detail authorization before routing to the order.

FCM is at-least-once. Native stable notification tags and a bounded recent-event cache reduce duplicates; no exactly-once OS-delivery claim is made. Distinct orders do not share an FCM collapse key. Unregistered tokens are revoked after the provider reports UNREGISTERED. Background token refresh is forwarded by the Capacitor service; backend registration refreshes when the app next registers/opens with a valid session. Registration also refreshes after language changes.

Supabase refresh tokens and PKCE material use Android Keystore AES-GCM encrypted app-private storage. Backups and cleartext network traffic are disabled. The APK contains bundled UI, public Supabase client configuration and Firebase client configuration only. Rooted/compromised devices and UI script vulnerabilities are outside Keystore's protection.

## Retry and Android limitations

waitUntil is NOT a durable scheduler. Pending jobs remain in the existing database outbox; subsequent valid catalogue submissions opportunistically drain up to five jobs. Authorized operators can invoke the secret-authenticated android-push endpoint to recover due jobs. Guaranteed unattended retry would require an approved trusted worker invoking that endpoint with a securely held Supabase secret key. No scheduler is configured or claimed in this release. Quiet businesses may therefore wait for another invocation after transient failure.

Android notification permission, network, Google Play services, device power policies and user channel settings affect delivery. Force-stopped apps generally require reopening; swipe-away and force-stop are different tests. No promise of custom closed-app audio is made. Foreground alerts retain existing sound controls; background sounds use Android channels. Test on the user's actual Samsung device and battery settings before calling this production-ready.

Existing camera scanners, browser printing/downloads, Bluetooth/USB/LAN printer workflows and external WhatsApp/LINE links need physical-device verification. No native printer transport is implemented by this change. Do not assume browser print dialogs or downloads work inside Android WebView; use the existing browser workflow until verified or adapted. No existing business logic is removed.

## Rollback and updates

To stop Android delivery, set ANDROID_PUSH_ENABLED=false and disable the business controls. Keep the outbox/audit records. Restore the previous 6.3A submit-preorder deployment if needed; do not remove existing email functions or secrets. Avoid destructive down migrations. The additive schema can remain disabled. If the Web Push lease is deliberately restored, retain its transport='web' filter while Android device rows exist.

For app updates, increment versionCode and sign with the same owner-controlled release key. A web deployment does not update the bundled APK; rebuild/sync/re-sign/distribute it. Retain the debug and release signing distinction.

## Manual physical-device acceptance

- Install and launch; neutral logo, login, password visibility/reset, session persistence, logout.
- Back closes the current modal and preserves existing unsaved/payment safeguards; rotation, keyboard and safe areas remain usable.
- Four languages, long Spanish labels, Chinese text, Light/Dark/System and app restart.
- Notification permission denied: no repeated prompt; in-app requests still available.
- Admin test received, tap opens Settings, no claim based only on token registration.
- New controlled pre-order: one saved request/event/job, correct company only; tap opens exact authorized details.
- Foreground, minimized, swipe-away, locked screen, offline/reconnect and force-stop separately.
- Duplicate replay, stale lease and transient provider failure; retry does not duplicate an order.
- Three businesses: A receives A only, B receives B only, disabled C receives none.
- Logout/account switch: prior-account notifications suppressed; revoked staff cannot open details.
- POS checkout, cash/card/QR, inventory, receipts, customers/loyalty, catalogue and team permissions.

Official references: https://capacitorjs.com/docs/guides/push-notifications-firebase ; https://capacitorjs.com/docs/apis/push-notifications ; https://firebase.google.com/docs/cloud-messaging/send/v1-api ; https://firebase.google.com/docs/cloud-messaging/android-message-priority

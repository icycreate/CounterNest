# Android local verification results — 2026-10-31

Passed:
- Firebase project/package validation against the supplied google-services.json.
- TypeScript check and production web build.
- Capacitor Android sync.
- Gradle debug and unsigned release assembly (JDK21, SDK36), including release vital lint.
- 107 SQL migrations applied in isolated PGlite PostgreSQL tests; no production migration performed.
- Eight Android database integration groups: role denial, protected tokens, three-company isolation, disabled alerts, exclusive leases, stale acknowledgment denial, retries, invalid tokens, scoped/rate-limited tests, actual catalogue intake/replay without email, unchanged stock, logout/session revocation.
- Android worker mocked tests: configuration gates, localized minimal payloads, distinct events, test labels, retries, bounded drain and stale-lease stopping.
- Existing 6.3A database integration (seven groups) and email handler tests (eight groups, mocked provider).
- Existing frontend/product UI tests and full database integration suite.
- Forty Android-settings layout cases: 320/360/393/412/768px, four languages, Light/Dark; explicit permission/test interactions. Browser engine with native APIs mocked, not physical Android WebView.
- Existing v6.2 browser regression: 80 header and 72 Review Match cases, keyboard/confirmation safeguards, CSS magnification/text scaling.

Build warnings: existing vendored libphonenumber eval warnings, large JavaScript chunks and mixed static/dynamic import warning; Gradle flatDir/deprecation notices.

npm audit: four MODERATE findings in the Capacitor CLI development dependency chain (@capacitor/cli, rimraf, glob, minimatch), no high/critical findings. The suggested fix downgrades Capacitor CLI to incompatible v4; no force downgrade applied. These tools are not packaged as Android runtime code.

Physical device: debug APK installed successfully on Samsung SM-S908U1 and launched to the sign-in screen. Initial inspection found a clipped Android splash and status-bar overlap; splash safe-zone assets and Android-only native viewport insets were corrected and rebuilt/reinstalled. The user confirmed successful sign-in. Subsequent real-device inspection identified a dashboard intrinsic-width issue that enlarged the layout from 384px to 588px. The corrected grid sizing restores a 384px viewport and keeps the incoming-order popup and fixed navigation within screen bounds.

Not verified yet: exhaustive Android WebView layouts, real FCM delivery and notification taps, live multi-company behavior, actual provider authorization/failure recovery, native printer/camera/download flows, release signing, production backend deployment. No complete production-ready or end-to-end push claim is made.

Initial build failures corrected: duplicate template splash resource; app-level Firebase Messaging compile dependency missing. Final artifacts must be generated after the last web sync.
# APK verification

Final Gradle assembly succeeded after the final web sync. Android SDK apksigner verified the debug APK signature. Android resource inspection confirms package com.counternest.pos, versionName 6.4.0, versionCode 60401, minSdk24, targetSdk36 and launchable activity com.counternest.pos.MainActivity. Release candidate remains unsigned; no release signing key is configured.

## Phone sizing follow-up — 2026-11-01

- Dashboard chart/table grid children now shrink to their container, with internal scrolling preserved; no global clipping hides app content.
- Incoming-order actions wrap into a two-column phone layout, headings and long notes wrap, and the panel scrolls within the viewport. View later remains distinct from acknowledgment.
- Real Samsung SM-S908U1 measurements after correction: 384px client, layout and document width on Dashboard, Sale, Products, Customers, Inventory, Pre-orders/Custom Cakes, Catalogue, Reports and Settings. No record edits, sales or payment submissions were made during these navigation checks.
- 48 offline browser regression cases passed at 320/360/384/393/412/768px, four languages and two themes, using the actual IncomingOrder component and a dashboard intrinsic-width fixture. All action buttons fit and retain 44px touch targets; long order details scroll.
- Native system-bar insets and splash-mask padding were corrected following actual installation. Sign-in succeeded according to the user. Incoming in-app notifications displayed; this was not an FCM delivery test.
- Search dialog measured within the phone viewport. The additional Android Back check was declined and remains unverified. Keyboard/power-policy checks remain manual UAT.
- Android versionCode incremented to 60401 for the corrected build. Backend push activation and signed production release remain pending.

Final installed-build verification: versionCode 60401 installed successfully on the authorized Samsung phone. After authentication loading completed, the saved signed-in session was restored. The packaged app (without injected CSS) measured 384px viewport/client/document width. Temporary debug forwarding was closed after verification. No live order status or payment/inventory data was changed.

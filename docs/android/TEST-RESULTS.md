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

Not verified yet: physical installation/login, Android WebView layouts, real FCM delivery and notification taps, live multi-company behavior, actual provider authorization/failure recovery, native printer/camera/download flows, release signing, production backend deployment. No complete production-ready or end-to-end push claim is made.

Initial build failures corrected: duplicate template splash resource; app-level Firebase Messaging compile dependency missing. Final artifacts must be generated after the last web sync.
# APK verification

Final Gradle assembly succeeded after the final web sync. Android SDK apksigner verified the debug APK signature. Android resource inspection confirms package com.counternest.pos, versionName 6.4.0, versionCode 60400, minSdk24, targetSdk36 and launchable activity com.counternest.pos.MainActivity. Release candidate remains unsigned; no release signing key is configured.

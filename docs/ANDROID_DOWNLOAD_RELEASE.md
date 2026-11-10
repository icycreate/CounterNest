# Android download experience — implementation and release gate

## Current status (November 10, 2026)

Implemented `/download` in the existing React app, outside the login/configuration gate. Entry links appear on sign-in, public Catalogue footer, and Settings. The page uses official CounterNest artwork, existing translation/theme infrastructure and isolated page styles at 390 × 844. The approved POS viewport CSS is unchanged.

The page includes installation/security guidance, update checks, version/build/date/size/Android requirement/notes/checksum/certificate information for approved releases. Native builds use Capacitor App.getInfo to compare numeric build codes. Equal/newer installed versions do not offer a downgrade. Unknown native build metadata blocks the download action. The APK opens in the system browser through Capacitor's existing external-origin Intent handling; Android installation remains user-approved. No package-install permission, silent installer, or security bypass was added.

`public/releases/approved.json` intentionally contains `release: null`. `src/androidRelease.ts` intentionally has no approved certificate fingerprint. No APK is offered until both are reviewed and configured. The manifest has no-store headers, public CORS for the native app's local origin, and explicit service-worker cache exclusion. Web pages read their own origin; the installed app checks the official production origin. Fetch failure clears prior download availability rather than offering a cached release.

**No release has been published.** Planned page: https://counternest.vercel.app/download. This source is not deployed to production, so that URL is not claimed as a working download page yet. No final APK URL exists.

## Signing audit and blocking conflict

- Application ID: `com.counternest.pos`, unchanged.
- Supplied debug APK: version code 60502, version name 6.5.0, 14,564,851 bytes; SHA-256 `d7dcc3f814a72b44ba956615ae9e045a058ab991014eb2ec420c0fa62f6e387e`.
- Certificate: `CN=Android Debug`; SHA-256 `3ba3111813512552497bcf5f9f069b57b816caefd91ab5d76be1c177a2f6d044`.
- Existing `app-release-unsigned.apk`: 12,857,347 bytes, fails apksigner verification. Neither artifact is distributable as a production release.
- User confirmed only debug signing exists. No production keystore was created or substituted. No debug key was promoted to a production credential.
- A new production certificate cannot normally upgrade the existing debug-signed installation. Preserving that certificate and distributing a production-identity APK are conflicting requirements. Resolve the migration plan explicitly; do not uninstall the existing app or erase its saved session/data automatically. A new signing identity requires explicit user authorization and a managed migration plan. Retain the package ID.

Gradle release tasks now require `CN_ANDROID_KEYSTORE`, `CN_ANDROID_STORE_PASSWORD`, `CN_ANDROID_KEY_ALIAS`, and `CN_ANDROID_KEY_PASSWORD` from a local/protected environment. No secret values are stored in the repo or requested in chat. Debug signing is unchanged. Final artifact verification rejects Android Debug certificates even if someone mistakenly supplies the debug keystore to the release build.

## Supabase hosting assessment

Read-only organization inspection reports **Free**. User expects fewer than 100 downloads/month. At 13–15 MB each, budget roughly 1.3–1.5 GB/month before retries and other application traffic. Official current limits: Free maximum file size 50 MB; egress quotas 5 GB uncached and 5 GB cached. APK size fits; available storage and remaining shared quota must still be verified. Database policy inspection failed with connector database authentication error, so no existing bucket/policy state is assumed.

Prefer `app-releases` once the remaining quota/global limit and policies are checked. Proposed bucket/permissions are in `ANDROID_RELEASE_STORAGE_PROPOSAL.sql`; **not applied**. If remaining quota is insufficient, a public GitHub Releases asset is a compatible alternative, but requires approval for public release exposure and a reviewed change to the exact host/path allowlist. Do not put production keys or private source in a public hosting repository. No alternate host was created.

Sources:
- https://supabase.com/docs/guides/storage/uploads/file-limits
- https://supabase.com/docs/guides/platform/manage-your-usage/egress
- https://supabase.com/docs/guides/storage/security/access-control
- https://developer.android.com/studio/publish/app-signing

## Publication procedure — approval required

1. Resolve the production-signing/migration decision with the owner. Keep keystore/passwords in approved offline custody/protected CI. Pin the approved public certificate SHA-256 in `src/androidRelease.ts` through a reviewed PR. Do not reuse the debug certificate.
2. Increase Android versionCode above 60502; choose the reviewed versionName. Build with required public backend configuration (`npm run android:sync`) and production signing (`gradlew :app:assembleRelease`). Keep APKs outside Git.
3. Run `node scripts/verify-android-release.cjs <apk> <four-language-notes.json> <new-candidate.json>` with `JAVA_HOME`, `CN_ANDROID_BUILD_TOOLS` and `CN_ANDROID_CERT_SHA256` set. The verifier checks apksigner, non-debug certificate, package, debuggable flag, version, minSdk, size and SHA-256. It creates a new candidate without overwriting files, with `approved:false`, no release date, and unpassed device/download gates. It never uploads anything.
4. Test the signed APK on a clean device and over a previous production-signed version. The current debug install is not a valid production-upgrade test. Verify saved login, authenticated login, tenant selection, notifications/deep links and the approved mobile layout. For the first production release, explicitly record that there is no previous production version and document the debug migration instead of claiming upgrade passed.
5. Inspect Storage limits, usage, and all existing storage.objects policies. Confirm only designated **platform release administrators** have dashboard/service-role publishing access; POS/business-admin roles are not release administrators. Protect the manifest, certificate pin, verification scripts, storage proposal and build config with required release-owner review in repository rules. Repository review protection and administrator identities must be verified, not assumed from an in-app role.
6. Obtain explicit approval for the exact storage proposal. The public bucket contains only approved installers; client INSERT/UPDATE/DELETE is denied by restrictive bucket-scoped policies even if other permissive policies exist. No service-role credential is included in clients. Do not add broad authenticated upload grants. Check existing buckets before applying the non-overwriting proposal.
7. Obtain explicit release publication approval including version, hash, certificate and test report. Upload using the authorized dashboard/protected publisher with `upsert=false`, path `<versionCode>/CounterNest-<versionName>-<versionCode>.apk`, MIME `application/vnd.android.package-archive`. Never replace bytes at an existing version URL. New bytes require a new versionCode/path.
8. Fetch the public versioned URL, compare exact byte length and SHA-256 against the local signed APK, and rerun signature/package checks on downloaded bytes. Test browser download and Android handoff. Record actual results. If verification fails, do not point the manifest at it; follow a separately approved removal/remediation process.
9. In a reviewed PR, replace only the manifest release with the verified metadata, `approved:true`, `buildType:"release"`, and actual publication date (YYYY-MM-DD). Include all four release-note languages. Publish the manifest last. Only a reviewed production website deployment makes it available to installed apps. Do not copy the candidate's verification bookkeeping into the UI as proof of tests that were not run.
10. Verify `/download`, no-store/CORS headers, APK bytes, new/equal/older update states, and platform installation approval on the actual device. Preserve earlier versioned files. To withdraw an unsafe release, set the manifest to null through an emergency reviewed deployment and separately review file access/removal; existing downloaded files cannot be recalled.

## Executed tests and limitations

- TypeScript and Vite production build passed. Existing large-chunk/vendor warnings remain.
- Shared accessibility regression passed.
- Release parser tests passed: absent/unapproved/debug metadata, wrong host/path/package/certificate/hash/size/version and incomplete translations are rejected; newer/equal/older comparisons verified.
- Browser page tests: 64 combinations across 8 requested sizes, 4 languages and Light/Dark. No horizontal overflow. Error/unavailable states and mocked native version comparison passed. System theme is provided by the existing theme hook.
- Synthetic file download byte-for-byte SHA-256 check passed. This is explicitly not a production APK integrity or installation result.
- Actual supplied APK audit: debug certificate confirmed; unsigned release fails signature verification. Candidate verifier rejects both.
- Production signing gate fails as expected because no production signing credentials exist. A production APK build is **blocked**, not passed.
- No production storage changes, uploads, installer publication, signing-key creation, phone install/upgrade, authenticated-login test, or production deployment performed.
- Seven broader historical regression-suite failures remain outside this task; this report does not turn those into passes.

## Modified source areas

`src/AndroidDownload.tsx`, `src/androidDownload.css`, `src/androidRelease.ts`, `src/androidDownloadTranslations.ts`, `src/translations.ts`, `src/main.tsx`, `src/App.tsx`, `src/CustomerStorefront.tsx`, `public/releases/approved.json`, `public/sw.js`, `vercel.json`, `android/app/build.gradle`, `scripts/verify-android-release.cjs`, and focused tests/docs. No Supabase migration or function changes. The existing mobile layout rules are preserved.

The existing 256-case dashboard/mobile viewport regression also passed after the changes. No changes to src/mobileFoundation.css or index.html were made.


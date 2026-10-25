# Automatic system language detection — RC20

2026-10-23. Implemented in the existing RC19 CounterNest source.

**Untested, not build-validated, not type-checked and undeployed. No websites, external APIs, GitHub, Supabase Cloud or live databases were accessed. No tests or deployment actions were performed.**

## Behavior

The existing localization module resolves language during module initialization, before React renders login or the Catalogue. It checks navigator.languages in order, followed by navigator.language. Intl.Locale parses BCP 47 identifiers. Unsupported/malformed entries are skipped and the first supported match wins; no match uses English. English regional tags map to en; all Spanish regional tags (including es-MX, es-GT, es-ES) map to es. Chinese Hant maps to zh-TW and Hans to zh-CN; an explicit script takes precedence over region. TW/HK/MO map to Traditional Chinese and CN/SG to Simplified Chinese. Bare zh uses the platform's likely script (normally Hans). Unicode extensions are handled by the locale parser.

No prompt is shown on first use and no detected value is stored as an explicit preference. The existing selector remains available. Selecting even the currently detected language stores a manual choice. Subsequent automatic detection or browser languagechange events never override a valid explicit choice. If localStorage is unavailable, manual selections remain in memory for the current session; persistence across restarts requires available browser storage.

## Separate staff and customer preferences

Internal pre-login screens retain the existing `counternest.language` manual device key. After login the existing account key (`counternest.language.user.<encoded scope>`) and existing saved personal backend preference are honored. The backend preference is applied once available; absent one, the existing explicit device choice or browser detection is used. A manual change made during account preference loading is retained. Language scope waits for a known business/account context, and scope changes do not save detected languages to the backend.

The former display-change/save coupling is separated: `counternest:language` refreshes the interface, while `counternest:language-manual` saves intentional staff choices through the existing personal preference workflow. No shared business language settings are changed.

Public Catalogue, Catalogue display, Ready display and private Track Order routes use `counternest.language.customer`. This key is shared by customer pages and installed Catalogue apps on this origin, but is independent of the POS device/account keys. The legacy unscoped key cannot distinguish an older customer's choice from a staff choice, so it is intentionally retained for POS only; customer pages detect their language until a choice is explicitly saved to the new customer key. Existing keys are not deleted or rewritten in bulk. Same-origin customer tabs reflect explicit customer preference changes; staff preference changes do not affect them.

The existing translation engine, category-label mapping and language selector continue serving Catalogue, Cart, Place Order, Track Order, notification settings and customer messages. No new translation engine, user-name translation, product-name rewrite, description mutation or order data change was introduced.

## Notification integration

Customer subscription registration already records the selected language. An existing registered subscription now synchronizes its language when its customer notification settings are mounted and the chosen language changes. It reads saved backend preferences first, preserving other notification toggles and avoiding submission of unsaved checkbox edits. It does not request permission, create a PushSubscription or enable notifications automatically. Existing consent, private tracking-token authorization, outbox deduplication and localized service-worker payloads remain.

Closed/background devices continue using the last successfully saved subscription language until the customer reopens the app/settings with connectivity. Already queued or delivered notifications cannot be retroactively translated. Existing notification migrations, server configuration and device consent requirements still apply. No new migration or notification service is required.

## Modified files

- `src/i18n.tsx`: ordered browser detection, BCP 47 matching, dedicated customer key, saved-account hydration, manual-only save event, storage/languagechange listeners and in-session fallback.
- `src/App.tsx`: account preference hydration and manual-only persistence; public routes ignore staff preferences.
- `src/CustomerOrderNotifications.tsx`: language synchronization for previously registered customer subscriptions.
- `public/sw.js`: cache release identifier only; existing staff/customer handlers remain.
- Package/release metadata, README, changelog and this report; complete inventory in MODIFIED_FILES_RC20.md.

No SQL migration, role permission, operational workflow or existing business record was changed. No database preservation claim was verified against live services. Historical tests/QA reports retained from earlier sources are not evidence for this release.

## Manual installation

Use the complete RC20 source archive as an update to RC19 through your normal future deployment process. Retain existing private environment configuration and database; do not reset or reseed. There are no new environment variables or migrations (97 existing migrations remain). Deploy the updated frontend and service worker when separately authorized; refresh/reopen existing PWAs so the new bundle loads. Existing RC19 WhatsApp and RC18 Web Push setup instructions remain applicable. This task did not install dependencies, build, test, contact services or deploy anything.

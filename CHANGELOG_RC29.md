# CounterNest RC29 — 2026-10-28

Continues RC28 without rebuilding the application. Offline implementation; not deployed.

- Added a seven-stage setup journey with server-persisted progress, Save & Exit, resume, review checks, business type, content-language default and POS payment-method controls. Reuses the existing profile, products, staff and three catalogue editors.
- Added a searchable contextual Help Center with 13 topics, step navigation, keyboard focus management and English, Spanish, Traditional Chinese and Simplified Chinese labels. Existing staff/customer tutorials remain included.
- Added private durable drafts for Home, Categories, About Us, product forms and business/settings forms. Added autosave status, compare/reload, navigation Save Draft, draft revision conflicts and exact-operation retry handling. Publication remains explicit.
- Added previous-publication history and restore-into-draft controls. Existing category IDs and independent media assignments are preserved.
- Extended authorized global search with category results, grouped display and keyboard/screen-reader selection information.
- Added a purpose-scoped Media Library with thumbnails, full preview, titles, search, sorting, usage checks, original-preserving uploads and crop-as-new. Referenced and historical assets cannot be removed through the library. Retired paths cannot be assigned again.
- Added optional requested pickup time and timezone to the existing immutable order snapshot and idempotency payload. Request details and incoming alerts distinguish this from a staff-confirmed pickup.
- Added request search/date filters and optimistic conflict checking for internal notes. Existing decision, notification, stock and accepted-order workflows remain authoritative.
- Added honest workspace connection status and bounded refresh backoff, catalogue loading placeholders, available-variant price presentation, and additional responsive/reduced-motion styles.
- Added product edit timestamp checks. Product edits still exclude existing stock from their update payload.
- Added four forward-only migrations (102–105), focused database/browser/localization tests and manual release documentation. Preserved all original 101 migration files unchanged.

Optional new advanced analytics are deferred. Existing reports, forecasts and numerical summaries are retained. See RC29_PHASE56_REPORT.md for validation results and limitations; this is not an all-tests-passing or production-signoff claim.

# CounterNest UI & Operations Enhancement v4.0 — RC28

27 October 2026. Updated locally from RC27. No external services, production data or deployments were accessed. This is an incremental implementation across the existing four-phase foundation, not a replacement application.

## Phase coverage

| Phase | Existing source retained | RC28 implementation |
| --- | --- | --- |
| 1 — UI Foundation | Shared Button/Field/Surface components; readable theme tokens; Light/Dark/System preferences; responsive sidebar/drawer; route/unsaved-work guards | Correct role labels for Manager, Accounting and Employee on desktop/mobile; keyboard skip-to-main link using shared colors |
| 2 — Catalogue Experience | Independent Home Page, Categories and About Us editors, revision checks, separate media buckets, original/crop references, four content languages, visibility controls | Publication review with cancel/publish, scoped image count, immediate-publication explanation and focus handling; Home/Category previews use the content language being edited |
| 3 — POS Optimization | Favorites, recent products, barcode focus, held sales, server price/stock quote checks, payment locks, responsive checkout/payment layout | Held sales preserve selected option labels with bounded storage validation; HTTP-LAN compatible UUID fallback; barcode search in product grid; lowest available variant price; simple-product stock/low-stock display; translated hold/favorite messages |
| 4 — Smart Dashboard | Role-projected workspace RPC, reports, sales overview, production boards, accepted orders, inventory/operational alerts | Manager pre-order quick action; visible refresh progress/success timestamp/failure warning; timestamps clear on account/workspace change; restricted sales metrics remain hidden |

## Publication and data behavior

Each editor still saves through its original RPC and revision checks. Clicking Save Changes opens review; Back to editing or Escape performs no upload/write. Publish changes runs only that editor's save. Failure preserves the local draft and leaves published database content unchanged. Drafts remain browser-memory edits until saved; scheduled publishing and cross-device draft storage are not added. The visibility settings decide which published sections customers see. Removing media references does not delete stored objects.

The three editors retain independent language/content and image management. Product, customer, business and user-authored text is never automatically translated. Existing language detection, manual language preferences, tutorials and the English silent customer video are preserved.

Held sales store selection IDs/options/quantities, never prices, payment details or customer contact information. Resume uses the existing authoritative quote. The local demo path refuses complex options rather than silently losing them. Stock labels are the latest loaded simple-product inventory, not reservations; checkout remains authoritative. No order submission or hold operation deducts stock.

No new database migration, schema, business setting, role permission, external-message behavior or notification recipient rule is introduced. All 101 migration files remain byte-identical to RC27.

## Verification actually performed

- TypeScript plus production build: passed on final application source.
- Local PostgreSQL-compatible engine: all 101 migrations applied; 145 broad database groups and 11 focused editor/security/notification groups passed.
- Offline browser: 11 new phase groups, 11 editor/inbox groups, 9 staff tutorial groups and 8 customer video groups passed.
- POS hold unit checks include option preservation, malformed option rejection, isolation/redaction, expiry, payment lock, storage failure and resume safety.
- Navigation/theme, accessibility, release, boot and branding checks passed.
- Browser checks used actual React components with mocked backend responses and blocked external requests. Viewports: 390, 768 and 1280 pixels. New review dialog checked in both Light and Dark; System uses the retained shared theme implementation. Browser checks are not physical phone or hosted Supabase acceptance.

Evidence: `validation/rc28/SUMMARY.json`, browser result files, broad regression logs and build log. Copied historical test harness output may retain its original RC25/other version label; the RC28 summary identifies this run. Older reports elsewhere in the source are historical, not the acceptance status of RC28.

## Remaining validation gaps

The complete legacy test chain is **not green**. Independent execution of its groups leaves six failures:

| Group | Observed failure |
| --- | --- |
| test:display | Legacy catalogue renderer fixture unmounts during customer storefront rendering |
| test:customer-requests | Old WhatsApp phone fixture expects a link for an invalid Belize number |
| test:ux | Mock i18n module lacks languageOptions; POS hold checks pass before this failure |
| test:finalization | Mock CommercialCatalogue module lacks formatMoney |
| test:rc4 | Phone fixture expects an invalid eight-digit Belize national number to validate |
| test:experience | Service-worker test environment has no indexedDB |

Commands later in a failing chained group do not run. These failures remain open; passing focused checks do not replace full release acceptance. Boot/branding initially expected the previous cache string; those assertions were updated to RC28 and both reruns passed. The editor browser harness also needed a remount wait and a select locator correction; its final run passed without reducing assertions.

Build warnings remain for vendor phone-library eval, a large main bundle, and an existing mixed static/dynamic import. They do not stop the build. No dependency versions were changed or downloaded.

Real hosted auth/RLS, Storage HTTP uploads, push credentials/scheduler, background OS delivery, real payments/printers, physical iOS/Android installation and deployment must still be verified in an authorized staging environment. This package is not a claim of production readiness or completed deployment.

## Delivery

See `MODIFIED_FILES_RC28.md`, `CHANGELOG_RC28.md` and `MANUAL_DEPLOYMENT_RC28.md`. The full source archive includes the existing customer video/captions/transcript and staff guide. Dependencies, compiled output and private environment files are excluded. The adjacent SHA-256 file verifies the archive.

# CounterNest RC29 — Phase 5–6 implementation report

Date: 2026-10-28, America/Belize. Baseline: supplied RC28 source. All work used local source and cached dependencies. Synced `sources/` files were not edited. No website, GitHub, Vercel, Supabase Cloud, production database or external API was accessed. This release has **not been deployed**.

## Release status

The production build and focused database/browser checks pass. The entire legacy test suite does **not** pass: six previously recorded RC28 groups still fail for the reasons below. Real Supabase hosting, Web Push delivery, browser permission behavior on real phones, screen-reader auditing and deployment acceptance remain unverified. This report does not certify production readiness or full WCAG conformance.

## Implementation by phase

| Phase | Implemented or preserved behavior |
| --- | --- |
| 5.1 Setup | Seven resumable stages; backend cursor/review state; Save & Exit; registration contact/logo recovery; serialized existing company bootstrap; business type, default content language and POS method selection. Existing profile, category/product, staff and catalogue screens are reused. Ordinary existing businesses are not forced into the wizard. |
| 5.2 Help | Header Help Center with 13 permission-filtered topics, search, Back/Next, all-steps view, contextual help buttons, keyboard close/focus return and four languages. Existing interactive staff onboarding and customer video/written guides remain included. |
| 5.3 Drafts | Private server drafts for the three independent catalogue editors, product form and business/settings forms. Debounced saves, status/error reporting, retry operation IDs, compare/reload and revision conflicts. Save Draft navigation support and saving before setup-stage changes. Published catalogue revisions remain explicit. Product updates compare their original timestamp and exclude existing stock. |
| 5.4 Search | Existing permission-scoped bounded search extended with indexed category-name search and authorized category details. Grouped results, current-option semantics, keyboard selection and existing direct record navigation retained. No customer query history is stored. |
| 5.5 Media | Shared library organized by purpose; own-workspace listing; thumbnails/full previews, display titles, search/sort, usage, confirmation before removal, original-preserving catalogue uploads, crop-as-new and separate assignment selection. Existing product/logo editors remain the upload/replace/crop tools for those groups. Retirement prevents newly assigning a path after removal eligibility is checked. |
| 6.1 Pre-orders | Existing snapshots, server-triggered event/outbox, authorized recipients, decisions and stock rules preserved. Added optional requested pickup time/timezone to the canonical retry payload and immutable snapshot, request search/date filters and checked internal notes. Incoming details show requested time without treating it as accepted. Existing accepted-order preparation/fulfillment controls and supported staff assignments remain in place. |
| 6.2 Discovery | Existing categories, featured/new/seasonal filters, favorites, detail/options, approved category translations and public token isolation preserved. Added loading placeholders and display/filter prices based on available variants when any are available. Existing authored product data is not machine-translated. |
| 6.3 Accessibility | Shared controls/focus styles retained; Help dialog focus/close behavior, command selection semantics, status announcements, mobile media layouts and reduced-motion rules added. Existing numerical dashboard/report summaries retained. Exceptions and unverified real-device checks are below. |
| 6.4 Recovery | Workspace status distinguishes browser-offline from a successful backend read. Failed periodic reads back off up to two minutes; explicit retry can retry sooner. Existing checkout identifiers/recovery and server deduplication remain authoritative. Disabled POS methods reject new checkout intents while a completed intent can still return its original result. No offline financial queue was added. |
| 6.5 Optional analytics | Deferred. Existing reports, forecasts, charts and numerical summaries remain available; no speculative metrics or new analytics data pipeline was introduced. |

## Data and security boundaries

- The original 101 migration files are byte-identical to RC28. Four new migrations bring the total to 105. They have been executed only against a local PostgreSQL-compatible test engine.
- Durable drafts, publication history and media metadata are private and authorized against the current workspace. Draft persistence never calls a public publish routine automatically.
- The pre-company registration draft belongs to its authenticated account. Its optional logo is stored in the private `onboarding-assets` bucket under that account's ID, then copied into the existing shop-logo flow during company creation. This supports Save & Exit without dropping the selected logo. Registration assets are account-owned and intentionally excluded from workspace backups.
- Public visitors continue to receive published catalogue content only. Drafts and past publication values are not included in the public feed.
- Request time is optional. Existing request keys without that field keep their existing payload spelling; changed requested times on an already-used key are rejected. No stock is deducted on request submission.
- Contact still prepares/opens the customer's preferred platform and does not silently claim that an external message was sent. Accept/Decline retain guarded server decisions and audit history.
- Removing an image from a page is different from deleting its stored object. History and active draft references keep images protected. Crop-as-new never rewrites another page's assignment.
- POS payment-method settings apply to new `complete_pos_checkout` intents. Existing scheduled deposit/refund and other legacy ledger operations retain their original authorization and validation; this is not a new payment gateway or a global ban on historical-method adjustments.

## Local validation

| Check | Result |
| --- | --- |
| TypeScript and Vite production build | Passed; existing large-bundle, vendor direct-eval and mixed-import warnings remain. |
| Exact migration chain | All 105 files applied successfully locally. |
| Broad database regression | Passed; log records 146 PASS entries, including the legacy-upgrade fixture and existing business workflow/security groups. |
| Focused editor/security/recovery database checks | 23 groups passed: independent publication, retries, stale versions, role isolation, setup resume, media retirement/original protection, requested-time snapshot, payment replay after disabling a method, private registration logo and staff-note conflicts. |
| Catalogue/setup/help browser fixture | 14 groups passed using actual components and fictional data; all external requests blocked. Covers language switching without data loss, autosave/remount, media independence, failed publication, request layouts at 390/768/1280px in Light/Dark, notification links, setup resume, Help search/steps/Escape/focus return and no runtime errors. |
| New interface/help translation coverage | 159 detected labels have Spanish, Traditional Chinese and Simplified Chinese entries, with English source labels. |
| Legacy groups executed individually | 19 of 25 groups passed after updating the RC1 product fixture for the new draft RPC and original update timestamp. Existing stock-safety assertions were retained. |
| Live deployment, real push transport, production DB changes | Not performed. |

The RC1 fixture initially lacked the new draft RPC/timestamp and could not submit the product form. The fixture was corrected and rerun successfully. Release checks were updated to verify RC29, 105 migrations, the four exact upgrade filenames and their hashes; checks were not removed.

### Six unresolved legacy groups

These were already recorded in RC28. Their current logs are retained under `validation/rc29/`.

| Group | Observed failure |
| --- | --- |
| `test:display` | Old Catalogue/CustomerStorefront test renderer fixture unmounts before its root assertion. |
| `test:customer-requests` | WhatsApp fixture expects an invalid Belize phone number to produce a contact link. |
| `test:ux` | A mocked localization module does not export `languageOptions`; its dependent test bundle cannot compile. |
| `test:finalization` | A mocked CommercialCatalogue module does not export `formatMoney` used by tracking details. |
| `test:rc4` | Phone fixture expects an invalid eight-digit Belize national number to validate. |
| `test:experience` | Worker VM lacks IndexedDB used by persistent push deduplication. |

These failures must be resolved or dispositioned before a complete all-suite signoff. Passing the newer focused tests does not erase them. Earlier release reports bundled with the source describe their own historical revisions, not RC29.

## Limitations and remaining verification

- Saved server drafts survive reload/reopen; edits made while offline and not yet saved remain only in the current tab. The UI warns to keep it open. There is no claim that an unsaved offline edit survives a browser crash.
- Draft autosave can upload a private catalogue image before publication, but cannot publish its assignment. A failed upload can leave an unassigned object; the library can organize/remove eligible objects later.
- Publication history retains prior values and their referenced files. Automatic retention deletion is not introduced. Account-owned onboarding assets are also retained; administrators should use an intentional retention policy rather than deleting them blindly.
- Media usage checks deliberately favor protection over deletion and may conservatively flag a matching path embedded in saved JSON. Image changes update assignments only through the appropriate editor. Product/logo editing continues through the existing tools.
- Search remains a bounded suggestion interface, not an exhaustive export or full-text index. Request date/search controls filter the loaded authorized request list; exact notification links still retrieve their target when absent from that list.
- Existing supported order/production staff assignments are preserved; there is no new parallel staff-assignment system for public requests.
- Browser checks cover representative layouts and keyboard behaviors. Real screen readers, actual 200% browser zoom, System-mode OS switching, touch hardware, iOS/Android installed PWAs, printers and payment equipment still require the manual checklist. No blanket WCAG 2.2 AA certification is made.
- Push requires deployed HTTPS, matching VAPID keys, server worker/webhook/scheduler, authorized device registration and explicit permission. A local preview or notification test button does not validate end-to-end transport. Custom sounds while closed are not promised.

## Deliverables

The complete source archive, external SHA-256 checksum file, this report, CHANGELOG_RC29.md, MODIFIED_FILES_RC29.md, SUPABASE_MIGRATION_ORDER.md, MIGRATION_MANIFEST.json and MANUAL_DEPLOYMENT_RC29.md form this release. The ZIP excludes dependencies, build output and local secret files. No live deployment or repository action was taken.

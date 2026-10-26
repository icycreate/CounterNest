# CounterNest RC25 — implementation and validation report

26 October 2026. Based on the supplied RC24 source. Offline development only; no websites, external APIs, GitHub, Vercel, Supabase Cloud, production data or deployed resources were accessed or changed.

## Implemented

- Existing Settings → Catalogue Settings now contains Home Page, Categories and About Us editors. Each saves independently through protected RPCs. No new public page or authentication system was created.
- Home: multilingual heading, welcome, subtitle, promotion and CTA; supported existing destinations; section visibility; up to eight images; staged crop, original preservation, reorder, replacement, removal, captions, desktop/mobile fit, preview, cancellation and defaults.
- Categories: existing category IDs, product relationships and canonical names; translated public names/descriptions, optional cover, ordering, visibility, adding and preview. Hiding filters public products without changing their records or internal POS availability.
- About: existing #about page and Picture 3 editor retained; Restore defaults added. Home/category media use separate private buckets; About and products retain their original media ownership.
- Four-language controls and validation messages. Saved authored text is never translated automatically. Public Home/category copy uses the selected locale and then the configured default. About retains its existing field-level fallback.
- Removed obsolete TV-mode routing and unused slide configuration from the active customer component. Fullscreen, product gallery and automatic data refresh remain.
- Pre-Orders tabs use consistent spacing and touch targets. A global hidden-attribute rule prevents shared button styling from exposing hidden controls.
- Notification inbox adds request number, customer name, quantity count, preferred contact, timestamp, exact-record links, individual read and all-read actions. Authorized, workspace-filtered Realtime INSERT subscription complements the existing five-second active-session polling. Existing popup, audio, device registration, payment-dialog deferral, Contact/Accept/Decline and server push dispatch remain.
- Corrected inbox positioning after the browser check found its action buttons could appear above the viewport.
- RC24 customer-recognition migration now normalizes CRLF in its guarded function-body replacement. It retains the expected-body guard and does not replay completed migrations.
- Neutral CounterNest defaults and custom-logo behavior retained; existing POS cart, pricing, stock and acceptance-to-production logic preserved.

## Validation actually executed

- Production build, including TypeScript project checking: passed. The previous malformed JSX issue is not present in this source. Vite still warns about large chunks; this is a performance warning, not a compilation failure.
- All 101 migrations applied in local PGlite PostgreSQL. The broad database regression suite passed all 145 groups, covering sales, inventory, orders, permissions, workspace recovery, purchasing and existing notification infrastructure. Supabase auth/storage are mocked and pgcrypto extension creation is omitted in this local harness.
- New focused database suite: 11 groups passed. Includes independent saves, image references, stale revisions, public visibility, anonymous denial, cross-workspace/unauthorized notification access, idempotent submission and acknowledgement, and neutral branding.
- New offline Edge/Playwright browser suite: nine groups passed. Actual React components and CSS, mocked RPC/storage, all external page requests blocked. Covers four languages and draft preservation; two-image crop/reorder/save; reload; category cover; About Picture 3; independent pages/media; Pre-Orders at 390/768/1280 widths in Light/Dark; inbox metadata/badge/read/all-read/deep-link; no browser runtime errors.
- Passed existing frontend/UI, web deployment source, Edge Function source, RC1, catalogue export, operations, purchasing, boot, navigation/theme, calendar, shared style/gallery, units/appearance, accessibility/contrast, branding and redesign suites. Release manifest/hash checks were updated for RC25 and run.
- No lint command is configured.

## Tests that did not pass

The complete legacy npm test chain is NOT claimed green. Separate legacy suites still fail on outdated harness assumptions: catalogue-display mock/runtime expectations; customer-request links with a phone fixture rejected by current validation; UX mock missing languageOptions; finalization mock missing formatMoney; RC4 phone fixture with an invalid Belize number; service-worker experience mock without IndexedDB. These are recorded in the supplied evidence logs. Their corresponding full end-to-end scenarios are not claimed validated. Initial CSS-loader, browser-location, obsolete permission text and customer-link confirmation fixture failures were corrected where directly required for this update.

## Deployment and verification limits

- Undeployed. Real Supabase Storage HTTP uploads, hosted authentication/re-login, live Realtime delivery, Web Push delivery, closed-app OS notifications, physical mobile/PWA behavior and actual payment-terminal interaction remain unverified.
- Browser persistence tests remount components over a mocked saved backend. Database persistence is tested separately. This is not an end-to-end login test against Supabase.
- Foreground custom sound requires an active app and browser audio permission. A closed browser/PWA cannot be promised custom audio.
- Publishing requires migration 101 and existing backend setup. An old backend produces a visible error; the UI does not pretend to save locally.
- Editing follows the existing admin permission model. No new section-specific staff permission system is added.
- Image removal unpublishes references; physical objects are retained to avoid destructive cross-section deletion. Unused uploads can be reviewed for later server-side cleanup. Already issued signed image URLs can remain valid for up to one hour.
- Categories hide individual public product entries. Existing bundles/combos retain their established definitions and pricing; review bundled products when hiding a category.
- Use a full database and Storage backup before rollout. Existing application backup/export formats are not expanded to transport the new media buckets across workspaces.

See MANUAL_DEPLOYMENT_RC25.md, CATALOGUE_EDITORS_USER_GUIDE.md, CHANGELOG_RC25.md and MODIFIED_FILES_RC25.md. Earlier release reports in this complete source are historical; this report takes precedence for RC25 validation.

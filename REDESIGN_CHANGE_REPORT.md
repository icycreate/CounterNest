# CounterNest presentation redesign — RC15

Baseline: released RC14 plus reviewed unfinished customer UI work. The supplied combined customer/admin mockup is the visual reference. This is actual React application source, not a standalone mockup.

## REMOVED

- No source files, database records, business modules, uploaded logos, or product image records were deleted.
- Public rendering of product.notes in src/CommercialCatalogue.tsx was removed to prevent internal notes appearing in product detail. The field, stored values, and admin access remain unchanged. No business data removed.
- The old public browse composition is replaced on ordinary customer catalogue links. Its code remains available for explicit TV/kiosk/counter and POS selection modes; those workflows are preserved.

## CHANGED

| File | Classification | Change |
|---|---|---|
| src/CommercialCatalogue.tsx | Navigation presentation / bug fix | Routes ordinary /catalogue-display and token catalogue links to the new storefront; retains POS, counter, TV and kiosk modes. Price moves earlier in product detail. Internal-note text no longer rendered publicly. |
| src/CataloguePreorders.tsx | Visual only / bug fix | Cart photos, quantity stepper and existing notes field in item review; reusable saved tracking links. New cart after successful submission leaves the old confirmation. RPC payload, retries, pricing, contact policy and submission remain unchanged. |
| src/BusinessContacts.tsx | Component refactor | Optional accessible contact sheet reuses enabled business methods and the existing validated links. Settings and persistence unchanged. |
| src/App.tsx | Navigation presentation / visual only | Overview and sales summary move above production detail. Adds a chart of the same loaded net sale values, with explicit amounts. No fabricated growth, top-seller rankings or business metrics. |
| src/UxShell.tsx | Visual only | Optional overview slot, clearer search caption and settings/profile shortcut; same permission-aware search and role-filtered metrics. |
| src/main.tsx | Visual only | Loads customer and admin presentation styles; accessibility styles remain last. |
| src/translations.ts | Visual only | Four-language customer labels, navigation, story and search captions. Product/brand/option text remains user-entered. |
| public/sw.js | Presentation release cache | New cache namespace ensures refreshed frontend assets. Push handlers, registrations and data-cache exclusions unchanged. |
| package.json / package-lock.json | Release metadata | RC15 version; no new runtime libraries. Adds redesign regression command. |
| tests/ui-components.cjs | Regression update | Asserts notes remain absent from public details while price/variant behavior is retained. |
| tests/customer-request-ui.cjs | Regression addition | Checks that a second cart replaces an old confirmation without altering retry payloads. |
| tests/STATIC_RELEASE_CHECKS.cjs, tests/boot.cjs, tests/branding-rc14.cjs | Release assertions | Version/cache expectation follows RC15; baseline safeguards retained. |

## PRESERVED

All 103 files under Supabase and API are byte-for-byte identical to RC14. All 94 historical migrations remain unchanged; none are added. Role/navigation definitions, database client, IDs, permissions, RLS, inventory model, recipes, purchasing, daily cash, reports, backup/restore, calendar, notifications, PWA manifests, original image data and current approved transparent logos remain intact. Other operational screens inherit shared presentation styles without changing their handlers.

## ADDED

- src/CustomerStorefront.tsx: mobile navigation; desktop customer sidebar; image-led hero; search/category/filter controls; local favorites; cart, request-history links, account preferences, contact, About and specials navigation.
- src/customerStorefront.css and src/redesign.css: responsive customer composition and separate compact operational surfaces using configured accent/readable palette tokens.
- tests/redesign.cjs: search, tenant-scoped favorites, immutable product data, private-note exclusion and four-language navigation checks.
- Current reports and before/after screenshot gallery in docs/redesign-screenshots.

Exact changed source inventory: docs/rc15-validation/preservation-hashes.json. No cleanup deletion was necessary; legacy views that still serve a workflow were retained.

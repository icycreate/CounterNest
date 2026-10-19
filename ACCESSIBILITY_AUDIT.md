> Historical RC13 readability audit retained with RC14. Current branding validation is in BRANDING_IMPLEMENTATION.md and docs/branding.

# RC13 accessibility and readability audit

2026-10-18 · local release candidate

RC13 centralizes measured foreground/background pairs and enforces the shared Button paint contract. Remove, Delete, Archive, Decline, Clear, Reset and Void actions keep a strong red identity; disabled and loading labels remain opaque and readable. Cards, prices, fields, table rows, statuses, report panels, receipt toolbars and customer preorder steps use theme-safe colors. Staff Catalogue now initializes authentication and theme normally; token-bearing customer links remain public.

## Measurement targets

Normal text and project-disabled text: 4.5:1. Large text: 3:1. Control boundaries and focus indicators: 3:1 where applicable. Relative luminance uses sRGB linearization. Sources: [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html). Disabled text is exempt under WCAG; this project deliberately requires readable disabled labels.

## Automated evidence

ACCESSIBILITY_TEST_RESULTS.json records 126976 measured pairs: 4,096 sampled RGB accents and every 8-bit grayscale page background in both appearances with eight accents. Page, surface, table hover/selected, muted text, borders, focus, six semantic action pairs and four status pairs are checked. Renderer tests cover eight variants and four languages, native disabled/loading behavior and the staff/public Catalogue route distinction. Source scan found zero page-native button elements outside the shared component.

## Actual browser evidence

[Browser results](docs/accessibility/BROWSER_READABILITY_RESULTS.json): 70 scenarios, 5489 direct rendered text measurements; zero remaining measured contrast failures, horizontal document overflow or captured runtime-error findings. The DOM audit composites ancestor backgrounds/opacity and applies 4.5 or large-text 3 thresholds with 0.02 rounding tolerance. It flags image-backed text for visual review rather than pretending image pixels have uniform contrast. Screenshots were reviewed for loaded content and responsive wrapping.

Light/Dark module reviews include Dashboard, POS, Products, Catalogue, Customers, Loyalty, Cards, Pre-Orders, Calendar, Production, Inventory, Recipes/Ingredients, Suppliers/Supply Operations, Purchase Orders, Receiving, Daily Cash, Expenses, Staff, Reports, Audit, Settings, Backup/Restore, Readiness, Profitability and Production Studio. Additional checks cover Custom Cake fields, notifications, receipt preview, PO editor, receiving verification, customer product details and preorder subtotal/steps. System mode was tested under this host preference; Light/Dark were explicitly selected. Four languages were checked at 390px, Spanish at 768px and desktop at 1280px. Blue and bright-yellow accents were checked with encoded hex values.

Initial findings are retained in INITIAL_BROWSER_FINDINGS.json as historical evidence; use BROWSER_READABILITY_RESULTS.json for the corrected result. Fixes include the reported danger-link override, pale fixed surfaces beneath dark text, opacity-faded helpers/prices, transient selected-button paint, customer preorder steps and receipt toolbar.

## Reproduction

Run npm install, npm run test:accessibility, npm run build and npm test. For local visual sample review run node node_modules/vite/bin/vite.js --config docs/qa/rc13/vite.config.mjs from the extracted root, then open http://127.0.0.1:5193/products?qa_appearance=dark or /?qa_screen=contrast&qa_appearance=dark&qa_accent=%23ffff00&qa_language=es. Customer sample: /catalogue-display?token= followed by 64 lowercase a characters. contrast-read.js contains the read-only browser measurement function. This QA adapter never contacts live Supabase. Production uses the normal vite.config.ts and src/lib/supabase.ts.

## Limits

This is a readability correction audit, not certification of full WCAG conformance. Local fixtures include representative records and empty states; they do not exhaust every permission/data combination. Native OS date pickers, physical iPhone/Android/tablet rendering, installed-PWA chrome, live cloud sessions, custom photographic backgrounds, browser forced-colors and screen-reader task acceptance remain on the UAT checklist. User-supplied images cannot be exhaustively proved by token math; inspect branding/backgrounds after customization.


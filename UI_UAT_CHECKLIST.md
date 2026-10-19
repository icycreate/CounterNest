# RC14 branding acceptance

Local evidence is in BRANDING_TEST_RESULTS.json, BUILD_VALIDATION.json and docs/branding. Complete the remaining target checks before rollout.

- [x] Full, horizontal and icon variants are transparent vector paths with alpha-preserving fallbacks.
- [x] Boot, Login/Sign Up, dashboard/header, public/admin Catalogue, reports, Settings and receipt preview reviewed locally.
- [x] Light/Dark/System paths, desktop, 768px tablet and 390px phone layout checks.
- [x] Uploaded business colors and broken/missing fallback behavior checked; no default crop or white flattening.
- [x] Print HTML and four-language receipt regression checks.
- [ ] Physical iPhone/Android/tablet: cold start, OS preference changes, sharpness and safe areas.
- [ ] Installed PWA: update cache, offline logo variants, launch icon and OS splash appearance.
- [ ] Target browser Save as PDF and physical printer: receipt, Catalogue, purchase/inventory/operational reports and QR signage.
- [ ] Live Vercel/Supabase: signed custom logo URLs, remove/upload/recover, tenant favicon and token-bound Catalogue install identity.
- [ ] Check long/wide/portrait custom business logos with real records.

Acceptance: no platform white rectangle, cropped wordmark, stretching, mismatched panel or invisible dark logo. Intentional PWA maskable/OS canvases use the matching cream surface. All 94 SQL migrations remain unchanged from RC13.


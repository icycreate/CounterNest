# RC26 — Guided tutorials

26 October 2026. Implemented offline on the supplied RC25 source. No websites, live services, database changes or deployment.

## Delivered

1. First-use inline walkthrough on the internal Dashboard after sign-in/onboarding.
2. A persistent Tutorials entry to reopen, resume, choose topics and restart inside CounterNest.
3. DEMO_GUIDE_RC26.md: written presenter script and first-use instructions.

The walkthrough reuses current routes, permission checks, shared buttons, theme tokens and four-language localization. It does not add a duplicate settings page, authentication mechanism or translation engine. Steps cover welcome, business settings, products, sale, Catalogue editing, incoming requests, notifications, stock, preparation, reports and finishing. Only authorized topics appear. The introductory panel is nonmodal and does not automatically steal focus. It pauses during visible dialogs/payment activity. Existing navigation still controls unsaved-change handling.

Progress is saved locally per account and workspace on the device; no business settings are written. Storage failure falls back to session behavior. Finish means the guide was read, not that onboarding or operational setup was verified. There is no seeded demo tenant, simulated checkout or automatic business mutation.

## Executed validation

- TypeScript and production build: passed (`npm run build`). Existing large-bundle warning remains.
- Release/version/migration-hash/package checks: passed.
- Nine offline Playwright/Edge browser groups: passed. First Dashboard display; safe manual navigation and progress persistence across reload; all four languages; payment deferral/resume; completion/restart; role filtering and separate account/workspace progress; 390/768/1280 widths with Light/Dark custom accent; blocked storage; no browser runtime errors.

The browser fixture mounts the real tutorial component and application CSS. External page requests are blocked. It uses a navigation callback fixture; a live authenticated deployment and physical devices were not tested. Evidence is in validation/rc26. Full legacy regression was not rerun for this frontend-only change; the six legacy suite failures documented for RC25 remain unresolved and are not claimed fixed.

## Update instructions

Use the complete RC26 source ZIP. No new dependency, environment variable or database migration is required over an already configured RC25 installation. Existing 101 migrations are unchanged. Older installations still need the RC25 migration/setup sequence in MANUAL_DEPLOYMENT_RC25.md.

For a future authorized release, install locked dependencies, run the normal build, and deploy through the existing browser/LAN or Vercel process. Retain environment values, server functions and Storage policies. The service-worker cache version changes to rc26-tutorial. Refresh/reopen installed PWAs after deployment. Nothing was deployed here.

Reproduce the browser test with `npm run test:tutorial` using locally available Playwright. If it is outside the project, set COUNTERNEST_PLAYWRIGHT_MODULE to its module directory; COUNTERNEST_BROWSER can override the default Windows Edge executable. Results are written to tests/tutorial-results.json.

Older release reports in the complete source remain historical. This report describes RC26 only.

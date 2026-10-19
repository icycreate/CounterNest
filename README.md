# CounterNest POS — Readability RC13

Version 2.0.0-rc.13 · 2026-10-18 · continues actual Units and Catalogue RC12 source.

Browser/Web Application → GitHub → Vercel → Supabase Cloud.

RC13 centralizes measured foreground/background pairs and enforces the shared Button paint contract. Remove, Delete, Archive, Decline, Clear, Reset and Void actions keep a strong red identity; disabled and loading labels remain opaque and readable. Cards, prices, fields, table rows, statuses, report panels, receipt toolbars and customer preorder steps use theme-safe colors. Staff Catalogue now initializes authentication and theme normally; token-bearing customer links remain public.

Use Node 22.12+ or 24, npm install, npm run build, npm test and npm run test:assets. Vercel builds with npm run build and serves dist. Configure the public variables documented in .env.example; service-role credentials remain server-only.

RC12 upgrades need no SQL changes. All 94 migrations are byte-identical to RC12; fresh projects use SUPABASE_MIGRATION_ORDER.md. The approved full logo and icon assets are preserved.

Read ACCESSIBILITY_AUDIT.md, UI_REGRESSION_CHECKLIST.md, UAT_ACCEPTANCE_CHECKLIST.md, BUILD_VALIDATION_REPORT.md, KNOWN_ISSUES.md and SCREENSHOT_EVIDENCE.md. Existing unit/gallery and deployment guides remain applicable. This is a locally validated source candidate, not a cloud deployment.

Sample adapters under docs/qa and fixture entries under qa are isolated from the production entry point. Never use the sample QA configuration to deploy production.

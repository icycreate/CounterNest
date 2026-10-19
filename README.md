# CounterNest POS — Blended Branding RC14

2.0.0-rc.14 · 2026-10-18 · continues completed Readability RC13.

Browser/Web Application → GitHub → Vercel → Supabase Cloud.

RC14 replaces opaque bitmap-in-SVG fallback artwork with transparent vector paths traced from the approved CounterNest identity. A shared BrandLogo component keeps the full lockup in larger areas and the nest icon in compact areas, contains uploaded logos, selects platform ink for the containing surface, and recovers when a business logo fails or is removed.

Run npm install, npm run build, npm test and npm run test:assets using Node 22.12+ or 24. The asset pipeline is reproducible with npm run brand:assets; sharp is a development-only dependency. Production uses Vite normally, build output dist. Configure only documented public Supabase variables in Vercel; keep private credentials server-only.

No new SQL is needed when upgrading RC13. All 94 migrations remain unchanged. Fresh projects apply SUPABASE_MIGRATION_ORDER.md.

Read BRANDING_IMPLEMENTATION.md, RELEASE_NOTES.md, BUILD_VALIDATION_REPORT.md, UAT_ACCEPTANCE_CHECKLIST.md, SCREENSHOT_EVIDENCE.md and KNOWN_ISSUES.md. This package is a local release candidate. It has not been pushed or deployed to a cloud project.

The qa folder and docs/qa adapters are isolated sample fixtures, excluded from the normal production entry point. Use them only for local visual review.

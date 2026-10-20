# CounterNest POS — RC15 presentation redesign

Browser/PWA → GitHub → Vercel → Supabase Cloud.

Actual source redesign using the supplied customer/admin reference. Same operational modules and backend contracts. No database migration required for RC14 upgrades.

Start with INSTALL_UPGRADE_GUIDE.md. Review REDESIGN_CHANGE_REPORT.md, DATA_PRESERVATION_REPORT.md, BUILD_VALIDATION_REPORT.md, RESPONSIVE_VALIDATION_REPORT.md and ACCESSIBILITY_CONTRAST_REPORT.md. Open docs/redesign-screenshots/index.html for before/after comparisons.

Development: npm install; npm run dev. Production build: npm run build. Tests: npm test.

Use your existing Vercel environment configuration. Never commit credentials. No production database was accessed during this redesign. Live/device UAT remains listed in UAT_ACCEPTANCE_CHECKLIST.md.

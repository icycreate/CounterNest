# CounterNest POS — Units and Catalogue RC12

Version 2.0.0-rc.12 · 2026-10-18. Continues the actual Customer Experience RC11 source.

Browser/Web Application → GitHub → Vercel → Supabase Cloud.

RC12 adds a workspace unit registry, explicit base/purchase/recipe units, order and receipt source snapshots, normalized recipe quantities, a canonical product gallery, catalogue header/background decoration controls, stronger semantic contrast and the complete approved logo in medium/large areas. Compact marks and PWA icons use dedicated icon artwork.

Apply only migrations 93 and 94 when upgrading RC11. All original 92 files are unchanged. Fresh projects apply all 94 migrations in SUPABASE_MIGRATION_ORDER.md. No production deployment or cloud data changes are performed by this source package.

Use npm install, npm run build, npm test and npm run test:assets. Vercel uses npm run build with output dist. Use Node 22.12+ or 24, as specified in package.json. Copy .env.example into a private local environment or set the documented public variables in Vercel; never commit secret files. Supabase service-role credentials stay on server-only endpoints.

Read INSTALL_UPGRADE_GUIDE.md, UNIT_CONVERSION_GUIDE.md, PRODUCT_GALLERY_GUIDE.md, CATALOGUE_APPEARANCE_GUIDE.md, UAT_ACCEPTANCE_CHECKLIST.md, BUILD_VALIDATION.json and KNOWN_ISSUES.md. Existing Calendar, notifications, contacts, four-language system UI, Back handling and business-name preservation remain in place.

The qa/ folder contains isolated sample-data component fixtures used only with the external local QA configuration. They are not connected to production or referenced by the production entry point. Screenshots under docs/screenshots are explicitly sample-data verification evidence, not live business records.

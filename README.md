# CounterNest POS — Consolidated Release Candidate 3

Browser application → GitHub → Vercel → Supabase Cloud. Internal version 2.0.0-rc.3, build 2026-10-16-consolidated1. The visible product remains CounterNest POS, with your configured business name.

This source extends the finalized RC1 customer-request/register update. It includes role dashboards, command search, pinned navigation, notifications, four language preferences, appearance, held sales, customer tracking and response links, production stages and inventory receiving permissions.

- Start with [Release notes](RELEASE_NOTES.md), [Upgrade guide](SUPABASE_UPGRADE_GUIDE.md), [Known issues](KNOWN_ISSUES.md) and [UAT checklist](UAT_ACCEPTANCE_CHECKLIST.md).
- [Build validation](BUILD_VALIDATION.json), [database results](DATABASE_TEST_RESULTS.json), [role/language UI results](UX_UI_TEST_RESULTS.json), [translation coverage](I18N_COVERAGE.json).
- [GitHub upload](GITHUB_UPLOAD_GUIDE.md), [Vercel deployment](VERCEL_DEPLOYMENT_GUIDE.md), [environment variables](ENVIRONMENT_VARIABLES.md), [Supabase deployment](SUPABASE_DEPLOYMENT_GUIDE.md).

Use Node 22.12–24, then npm install and npm run verify. Vercel builds with npm run build and serves dist; vercel.json supplies SPA rewrites. Set the public Supabase URL and publishable/anon key in Vercel. Never put a service-role key or private credentials into browser variables.

Existing installations at migration 79 apply ONLY pending migrations 80 and 81, in that order. Fresh databases use all 81 files in SUPABASE_MIGRATION_ORDER.md. Do not replay earlier migrations.

Source packages deliberately exclude dependencies, build output, credentials, Git metadata, local QA fixtures and native installers. No live deployment or production account changes were performed.

Latest decisions: catalogue slides/rotations and timing controls have been removed. Initial requests use direct Accept Order / Decline Order. Accepted orders have a printable confirmation receipt, optional pickup/deposit, and a single shared kitchen queue. New product/gallery images open a crop editor before upload. The recommended catalogue PDF uses portrait cards. A neutral CounterNest default logo follows every current branding surface.

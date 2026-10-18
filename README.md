# CounterNest POS — Operations Calendar RC9

Version 2.0.0-rc.9. Continues the actual Navigation & Appearance RC8 source. Browser/Web → GitHub → Vercel → Supabase Cloud.

Operations → Calendar provides Month, Week, Day and Agenda over original accepted orders, custom cakes, production batches, and ingredient/legacy purchase orders. No calendar event table or duplicate business records are created. Date-only records stay date-only. Accepted orders without pickup times have an Unscheduled panel.

Authorized schedule edits update original records with concurrency checks and commercial-event audits. Includes search, type/status/staff/date filters, Today, planning warnings, source links, module quick-create, stable notification IDs, four interface languages and shared light/dark/accent themes.

## Run and deploy

1. Copy .env.example to your local environment configuration and supply your own Supabase URL and browser-safe key. Never commit privileged keys or local env files.
2. Run npm install, npm run build, npm test and npm run test:assets. Start locally with npm run dev.
3. Existing RC8 databases: apply migration 90 only, following INSTALL_UPGRADE_GUIDE.md. Fresh databases: apply all 90 migrations in SUPABASE_MIGRATION_ORDER.md.
4. Commit this source to the existing GitHub repository and deploy through the existing Vercel project. The ZIP excludes node_modules, dist, local secrets and installers.

See CALENDAR_USER_GUIDE.md, CALENDAR_IMPLEMENTATION.md, UAT_ACCEPTANCE_CHECKLIST.md, BUILD_VALIDATION_REPORT.md and KNOWN_ISSUES.md. Local automated and browser validation passed; live Supabase/Vercel staging and physical installed-PWA checks remain pending. Historical feature guides and screenshots retained from RC8 are baseline references; current calendar evidence is in docs/calendar-screenshots.

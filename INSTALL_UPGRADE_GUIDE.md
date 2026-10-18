# Upgrade RC8 → Operations Calendar RC9

1. Back up the current Supabase project and preserve the RC8 frontend deployment. Confirm migrations 1–89 already match SUPABASE_MIGRATION_ORDER.md. Those 89 files are unchanged in RC9.
2. Apply only supabase/migrations/202610171700_operations_calendar.sql (migration 90) to an existing RC8 project, using the normal privileged migration workflow. It adds two nullable production timestamp fields, indexes, authorized RPCs and audit triggers; it does not backfill invented times or delete production records. Do not replay the earlier migrations.
3. Fresh projects must apply all 90 migrations in the documented order. Use your existing Supabase Auth/RLS/storage and edge-function deployment instructions. Do not expose service-role credentials in frontend variables.
4. Run npm install, npm run build, npm test and npm run test:assets. Deploy this complete source through the existing GitHub/Vercel project with its own environment values. Build command: npm run build; output: dist. Local env files, node_modules and dist are excluded from the source ZIP.
5. Stage two separate businesses and all applicable roles. Verify four source types, original IDs/counts, real schedule changes, commercial_events old/new/actor/time, stale-edit rejection, notifications, timezone handling, original quick-create workflows and unchanged stock totals. Follow UAT_ACCEPTANCE_CHECKLIST.md.
6. Let the updated service worker activate and refresh. Verify Calendar in actual installed Android and iOS PWAs, including OS Back, offline/reconnect and update activation. Browser screenshots do not certify installed-device behavior.
7. Roll back the frontend by redeploying RC8 if required. Its original date fields remain compatible with the additive nullable columns. Preserve migration history and audits; removing the SQL wrapper/triggers requires a separately reviewed database rollback. Do not drop production data to undo the UI.

No production deployment was performed during this local build. See KNOWN_ISSUES.md for remaining staging/device acceptance.

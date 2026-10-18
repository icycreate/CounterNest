# Upgrade RC7 → RC8

1. Keep a verified backup of the current Supabase project and the RC7 frontend deployment.
2. Apply supabase/migrations/202610171500_shared_catalogue_theme.sql after the existing 88 migrations. It wraps the authorized catalogue RPC to expose four validated visual fields and publishes an administrator's appearance choice to that same business. It grants no public table access. Do not replay the old migrations on an existing database.
3. Deploy the complete RC8 source through the existing GitHub/Vercel project. Use the current VITE_SUPABASE_URL and browser-safe publishable/anon key; keep privileged keys in approved server environments only. Configure the Supabase Auth redirect allowlist and email templates for the deployed origin; password reset redirects to /dashboard.
4. Run npm install, npm run build, npm test and npm run test:assets before deployment. New installs apply all 89 migrations in SUPABASE_MIGRATION_ORDER.md.
5. Test an administrator appearance/accent save, a public Catalogue link on another device, sign-in/out, unsaved Back and email recovery. Public Catalogue polls visible data every five seconds. Existing personal non-admin appearance stays private.
6. Allow the updated service-worker shell to activate, then refresh. Native PWA launch colors/icons may stay cached until reinstall; an OS-controlled splash cannot animate.
7. To roll back the frontend, redeploy RC7. The additive RPC fields remain backward-compatible; retaining migration 89 is safe for RC7. Restoring pre-RC8 database definitions should be done only with a reviewed database rollback, not by deleting migration history.

# Upgrade guide — existing RC14 installation

1. Keep the existing Supabase Cloud project, business records, storage buckets, environment variables, Vercel configuration and workspace IDs.
2. Review REDESIGN_CHANGE_REPORT.md, DATA_PRESERVATION_REPORT.md and the screenshot gallery. Extract the ZIP to a clean source directory or branch, preserving your existing repository history.
3. Run npm install and npm run build. The Vercel project uses its existing Vite build and dist output configuration.
4. Deploy a Vercel preview against a dedicated staging environment for mutation-based UAT. Do not run sales, receiving, restore, deletion or other write tests against production.
5. For an existing RC14 database: run ZERO SQL migrations. Do not run old bootstrap SQL, reset, seed or restore scripts. Historical SQL is included solely as source history for the existing app.
6. Check the UAT checklist, then deploy through the existing GitHub/Vercel process. Existing environment secrets stay in Vercel; .env/.env.local are excluded from the ZIP.
7. Reload installed PWAs after the new service worker activates. The cache version changes; notification device bindings and push behavior remain intact.

Rollback: redeploy the previous RC14 Vercel build. There is no database rollback for this release. Keep original uploaded assets and records in place.

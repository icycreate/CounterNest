# RC11 → RC12 upgrade

1. Export and verify a workspace backup including media. Test on a staging Supabase project first.
2. Confirm the existing latest migration is 202610181200_customer_experience_notifications.sql (92). Apply 202610181600_ingredient_measurement_units.sql, then 202610181700_gallery_catalogue_appearance.sql. Fresh installs apply all 94 listed files. Do not re-run old migrations.
3. Confirm balances, source units, supplier links and historical purchases remain unchanged. Review flagged unknown units. Confirm existing product/variant photos appear in Product Edit before adding new photos.
4. Push the supplied source to your GitHub repository. Configure the existing Vercel project environment from .env.example; keep server credentials private. Run npm install and npm run build, output dist. Deploy existing Supabase Edge functions as already documented when changing their environment; RC12 does not replace cloud keys.
5. Deploy the frontend only after both SQL migrations succeed. The new service-worker cache version refreshes the app shell; close/reopen installed copies and verify the current version. API data is not cached as an offline sales database.
6. Complete UAT_ACCEPTANCE_CHECKLIST.md on staging, including mobile/tablet, installed PWA, storage upload and actual Supabase RLS. Only promote after business sign-off.

Rollback: these additive migrations preserve the old RPC signatures and original ledger fields. A prior frontend can use legacy base-unit paths, but do not delete columns, drop data or rescale stock to undo an upgrade. Export post-upgrade activity before any database restoration; a full restore needs planned reconciliation.

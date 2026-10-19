# RC13 installation and upgrade

Browser → GitHub → Vercel → Supabase Cloud.

1. Extract the source archive; use Node 22.12+ or 24.
2. Run npm install, npm run build, npm test and npm run test:assets.
3. Configure .env.example public variables in private local configuration or Vercel. Never publish service-role secrets.
4. RC12 upgrade: no SQL additions; all 94 migrations are unchanged. Earlier upgrades must apply only missing files in SUPABASE_MIGRATION_ORDER.md; fresh workspaces apply all 94.
5. Upload the normal source to GitHub and deploy with Vercel (build npm run build, output dist). Do not use the sample QA Vite configuration for deployment.
6. Complete UAT_ACCEPTANCE_CHECKLIST.md with the target cloud and physical devices.

RC13 updates the service-worker cache key. Reload the deployed application and verify the new version/readability after update. Existing unit conversion, galleries and business data use the established schema.

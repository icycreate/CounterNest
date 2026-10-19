# RC14 installation and upgrade

Browser → GitHub → Vercel → Supabase Cloud.

1. Use Node 22.12+ or 24. Run npm install, npm run build, npm test and npm run test:assets.
2. Normal Vercel build: npm run build; output dist. Configure the public environment values documented in .env.example; keep service-role credentials server-only.
3. Upgrading RC13 requires no SQL. All 94 migration files remain unchanged. Earlier/fresh projects follow SUPABASE_MIGRATION_ORDER.md.
4. Deploy the normal source through GitHub/Vercel. Do not deploy the isolated docs/qa configuration.
5. Reload/update installed PWAs to use the rc14-blended-branding cache, then complete UAT_ACCEPTANCE_CHECKLIST.md.

Optional asset regeneration: npm run brand:assets. Generated assets are already included; regeneration is not a production startup step.

> RC13 current release: 2.0.0-rc.13, build 2026-10-18-accessibility. Upgrading RC12 requires no additional SQL; all 94 migrations are unchanged. Use INSTALL_UPGRADE_GUIDE.md, ACCESSIBILITY_AUDIT.md and BUILD_VALIDATION.json for current scope. Earlier release-specific passages below are historical context.

> RC11 update: apply migration 92 after RC10. See INSTALL_UPGRADE_GUIDE.md and NOTIFICATION_SETUP.md for current deployment variables, webhook and retry setup. The detailed base deployment guidance below remains applicable.

# Vercel RC5 deployment

Import the intended GitHub repository. Root contains package.json and vercel.json. Use Vite, Node22.x, npm install, npm run build and output dist. Include api/catalogue-manifest.js for persistent customer PWA manifests.

Set VITE_SUPABASE_URL plus VITE_SUPABASE_PUBLISHABLE_KEY (or legacy VITE_SUPABASE_ANON_KEY), VITE_ENABLE_DEMO=false and optional VITE_PUBLIC_APP_URL for the target production/staging environment. The tenant manifest function needs the same public values at runtime. Environment changes require redeployment. Never expose service-role/secret keys in frontend or manifest configuration.

Apply pending SQL84–87 and deploy workspace-lifecycle to Supabase first. Verify /backup opens protected Workspace, purchasing/receiving refreshes work, and public catalogue routes stay independent of staff UI. Configure the final HTTPS origin in Display Settings and retest QR/customer PWA. Direct routes, API routing and SW no-cache headers are in vercel.json.

Local static preview exercises built routes/assets; Vercel function routing and real native installation require deployed HTTPS testing. No live deployment was performed.

Deploy the new workspace-lifecycle function and redeploy create-staff-account and reset-staff-password for owner-account protections after applying SQL84–87.


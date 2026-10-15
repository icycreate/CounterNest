# Vercel deployment

1. Import the private GitHub repository and select the directory containing package.json as Root Directory.
2. Framework preset: Vite. Install: npm install (or npm ci using the included lockfile). Build: npm run build. Output: dist. Node: 22.x or 24.x.
3. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. The legacy VITE_SUPABASE_ANON_KEY is accepted if the publishable variable is absent. Set VITE_ENABLE_DEMO=false. Use a staging Supabase project for Preview environments.
4. Initially leave VITE_PUBLIC_APP_URL unset to use the active origin. After deployment, set it to the final production HTTPS URL (no trailing path), and redeploy. Configure its Production scope; leave it unset for previews or use the preview's own approved URL.
5. In Supabase Auth URL Configuration, set Site URL to the production URL and add approved local, staging and production redirect URLs. Use explicit production URLs; restrict preview wildcards to your own account/project if needed.
6. Test login/email confirmation and reload /sale, /products, /settings, /catalogue?token=… and /catalogue-display?token=…&mode=tv directly. Test the four deployed Edge Functions.

vercel.json exists for SPA deep-link rewrites to /index.html, plus no-cache for the service worker, nosniff and no-referrer for token share links. Vercel serves existing build assets normally. dist remains untracked. The PWA caches public shell assets only; Supabase/auth/business data requests are not cached. Cloud transactions need connectivity.

Changing VITE_* values requires a rebuild. Never use a Supabase service-role or sb_secret_* key in any VITE_* variable or in Vercel frontend configuration. Frontend configuration validation rejects those key types, but build-time values are public, so never supply a secret at all.

No production deployment was performed during packaging. Verify HTTPS, SPA refresh, email redirect URLs, token rotation, RLS and account actions on your real hosting setup before go-live.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel rewrite configuration](https://vercel.com/docs/project-configuration/vercel-json).


## Customer QR and request setup
Deploy migration 79 before this frontend. Once deployed, admin saves the final HTTPS origin in Catalogue → Display Settings (or leaves it blank to use VITE_PUBLIC_APP_URL/current origin). Saved app origin takes precedence over the build variable. A saved production origin also directs preview-generated QR codes to production: use a separate staging Supabase project/origin for acceptance.

Enable sharing and permitted contact methods; scan the tokenized link on a logged-out phone. URLs include the shop display token and do not require staff login. Reprint physical QR signs/PDFs after domain/token changes. No messaging integration or additional frontend secrets are needed. Verify receipt QR has loaded before printing.

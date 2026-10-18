> RC11 update: apply migration 92 after RC10. See INSTALL_UPGRADE_GUIDE.md and NOTIFICATION_SETUP.md for current deployment variables, webhook and retry setup. The detailed base deployment guidance below remains applicable.

# Environment variables

| Exact name | Location | Requirement |
| --- | --- | --- |
| VITE_SUPABASE_URL | Vercel / local .env.local | Supabase Cloud HTTPS project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Vercel / local .env.local | Browser-safe sb_publishable_* key; preferred |
| VITE_SUPABASE_ANON_KEY | Vercel / local .env.local | Optional legacy anon JWT fallback; publishable key takes precedence |
| VITE_PUBLIC_APP_URL | Vercel / local .env.local | Optional canonical HTTPS production origin; defaults to current origin |
| VITE_ENABLE_DEMO | Vercel / local .env.local | false for production; true only for explicitly simulated preview; development defaults to demo when not disabled |
| SUPABASE_URL | Supabase Edge runtime only | Platform project URL |
| SUPABASE_SERVICE_ROLE_KEY | Supabase Edge runtime only | Platform server-only key; never VITE_* or committed |
| SUPABASE_ANON_KEY | Supabase Edge runtime only | Platform browser-safe key used for current-password verification |

All VITE_* values are public in compiled assets. .env.example contains placeholders; .env and .env.* are ignored except .env.example. No credentials were supplied or shipped. Changes to Vercel build variables require redeployment. Keep staging/preview data separate from production.


No new environment variables in this update. Saved customer public_base_url (admin UI) overrides VITE_PUBLIC_APP_URL for customer links/QR. Otherwise the active site origin is used. Use the final HTTPS origin without path/query/user credentials. Staging must use its own Supabase settings and public origin. Contact-method IDs, enabling and receipt QR are shop configuration, not environment secrets.

RC4: the Vercel catalogue-manifest function also reads the same VITE_SUPABASE_URL and public publishable/anon key at runtime. Deploy api/ alongside dist; changing its runtime environment requires redeployment. The endpoint rejects secret/service-role keys.

RC5 Edge-only optional WORKSPACE_PURGE_ENABLED: leave unset/false; true enables the server purge action only after recovery expiry and owner confirmation. No new frontend secret or key is required.

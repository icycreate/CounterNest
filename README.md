# CounterNest POS — Boot Experience RC7

Browser/Web Application → GitHub → Vercel → Supabase Cloud.

This source includes the actual web/mobile/PWA startup animation and retains RC6 purchasing behavior. Read RELEASE_NOTES.md, BOOT_IMPLEMENTATION.md, BOOT_UAT_CHECKLIST.md and BUILD_VALIDATION_REPORT.md.

Run npm install, npm run build and npm test. The ZIP excludes credentials, node_modules and dist. All 88 database migrations remain unchanged from RC6; no new SQL is required for this boot update. Existing migration/deployment guides still apply to older baselines. Key-stage design mockups are in docs/boot.

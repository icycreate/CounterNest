# CounterNest POS
Internal release: **CounterNest POS v2.0.0-RC1**, update build **2026-10-15-update1**. This package supersedes the original RC1 source without overwriting its archive.

Browser → private GitHub → Vercel → Supabase Cloud. No native installer or app installation is required.

## This update
- Catalogue → Display Settings: customer QR view/save/print, canonical public URL, copy link, preview and open display; optional receipt QR.
- Public catalogue: product details, multi-item pre-order requests, selected variant/quantity, customer name, enabled preferred contact method, notes, review and retry recovery. No pickup is required at intake; no stock/payment is reserved.
- Staff pre-order inbox: review/contact/confirmation/deposit states and one-time audited admin contact override. Confirmed requests link once to real scheduled orders and follow production/paid collection.
- Login opens Dashboard after authentication. Admin uses Daily Cash → Open Register to record station/opening cash. Legacy declarations remain historical; new writes are disabled.
- Numbered supply tabs removed; grouped, persistent, role-filtered navigation remains.

## Run and deploy
Use Node 22.12+ or 24 (below 25). Run `npm ci` (or `npm install`), copy .env.example to ignored .env.local and configure browser-safe Supabase settings. Keep demo false. Run `npm run dev`, `npm run verify`, then `npm run preview` to inspect the production build.

An existing database confirmed at original RC1 migration 78 needs **only migration 79**, `202610151200_customer_requests_register.sql`. Read INSTALL_UPGRADE_GUIDE.md and SUPABASE_UPGRADE_GUIDE.md first. All 78 earlier SQL files remain unchanged. A fresh project needs all 79 in the exact documented order. Never blindly push or replay the legacy SQL chain.

Use GITHUB_UPLOAD_GUIDE.md, VERCEL_DEPLOYMENT_GUIDE.md, ENVIRONMENT_VARIABLES.md and EDGE_FUNCTIONS.md for deployment. Vercel builds dist; source packages exclude dependencies, build output, local credentials and QA fixtures.

Start with docs/guides/CUSTOMER_REQUESTS_GUIDE.md for QR/contact/register procedures. Other user guides remain in docs/guides/. RELEASE_NOTES.md, BUILD_VALIDATION.json, DATABASE_TEST_RESULTS.json and KNOWN_ISSUES.md describe evidence and limits. UAT_ACCEPTANCE_CHECKLIST.md remains to be signed off on the real cloud and devices. Development history lives in docs/internal/history/.

This is a release candidate for staging UAT, not stable production acceptance.

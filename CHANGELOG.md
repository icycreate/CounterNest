# RC1 update — 2026-10-15-update1

- Added canonical customer catalogue QR view/PNG/print/copy/open/preview and optional receipt QR; all display/PDF destinations share URL rules and refresh on settings/token changes.
- Added public multi-item pre-order requests with optional timing at intake, enabled preferred method, sanitized server-priced snapshots, idempotent recovery, shop RLS and basic abuse caps.
- Added staff review/contact workflow, audited one-time admin overrides, linked scheduled orders, production/paid collection synchronization and unified audit/export coverage.
- Removed login cash declaration; explicit sign-in opens Dashboard. Admin opens the shared register with station and amount; old declaration writes are revoked and history retained.
- Removed numbered supply labels; retained grouped sidebar/roles and web-only deployment.
- Added migration 79 without changing 78 earlier files; added SQL/UI regressions and updated deployment/UAT/user guides.

# 2.0.0-rc.1 — 2026-10-15

- Consolidated seven collapsible navigation groups with persisted compact/group state and shared role-gated pages.
- Removed development numbering from staff/customer prose; retained internal history.
- Corrected master/variant price presentation and improved customer galleries, focus, touch layout and polling cleanup/timeouts.
- Added atomic, idempotent checkout recovery and checked stock counts; product edits no longer overwrite stock.
- Added append-only migration 78 for forced-password database restrictions, recovery ledger/RPC, indexes and export coverage; preserved 77 baseline hashes.
- Hardened four account Edge handlers against malformed input and pending-admin bypass; reset restricts profiles before Auth update.
- Added realistic bakery reconciliation, UI/PDF/Edge/security regressions and RC1 deployment/user guides.
- Local verification passed; live cloud, physical-device, print and concurrent-load acceptance remain pending. See KNOWN_ISSUES.md.

# 1.55.0 — 2026-10-14

- Rebuilt latest v1.54.0 Phase 36.9 source for GitHub, Vercel and Supabase Cloud.
- Removed native Android wrapper tooling, local host/HTTPS/firewall/autostart/Windows deployment scripts, generated build/config files and obsolete installation guides.
- Added Git exclusions, Vercel SPA rewrites and service-worker cache control; retained browser PWA support.
- Added staff URL routing and Back/Forward behavior; protected catalogue, kiosk/TV, kitchen and ready-display paths; legacy share-link support retained.
- Added browser key validation, legacy anon-key fallback and production configuration gate to prevent accidental simulated sales.
- Fixed catalogue PDF variant pricing/availability using authoritative server results; added detail discount percentage and mode=tv support.
- Restricted service-worker caching to shell assets and safe HTML navigation responses.
- Preserved all business modules, four account functions and all 77 historical migrations byte-for-byte. Zero new database migrations.
- Consolidated cloud deployment/upgrade/acceptance instructions; retained historical feature/changelog references under docs/internal/history.


- Fixed TV slideshow timers so catalogue polling does not restart slides; TV slides remain active beyond kiosk inactivity timeout.
- Corrected manifest icon URLs to emitted public PWA assets and verified image dimensions.
- Added lazy feature screen loading; main application chunk reduced from roughly 697 KB to 410 KB.

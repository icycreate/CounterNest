# Phase 24 — Production Supabase Setup

Phase 24 promotes CounterNest from development configuration to one controlled production Supabase project. The existing schema, Row Level Security architecture, Daily Cash workflow, and POS behavior remain unchanged.

## Production procedure

1. Create or select the production Supabase project. Record its owner, region, support contact, and recovery contact in protected management records—not in the application folder.
2. In Supabase Authentication, keep Email enabled and decide whether new accounts must confirm email. Add `http://127.0.0.1:4173` to the allowed redirect URLs for the internal Windows installation.
3. Apply the 19 SQL files listed in `SUPABASE_MIGRATION_ORDER.md` to a separate test project first. Review the result, take a backup, and then apply them to production in the same order.
4. Copy `.env.example` to `.env`. Enter the production Supabase URL, browser-safe publishable/anon key, and `VITE_PUBLIC_APP_URL=http://127.0.0.1:4173`.
5. Never place a service-role key, database password, access token, or Android signing password in `.env` or frontend files.
6. Run `npm run production:validate`. When internet access and the production project are ready, run `npm run production:validate -- -CheckCloud`.
7. Build with `npm run build`, sign in as the owner, and complete the Phase 18 Launch Readiness checks.
8. Create a separate test company/account and verify that it cannot read or change the production company’s records.

## Required evidence

- Production project reference and responsible owner.
- Migration history showing all 19 files applied in order.
- Authentication redirect configuration record.
- Successful local and cloud production-configuration validation.
- Administrator/employee permission results and two-company isolation result.
- Fresh encrypted business backup with verified SHA-256 integrity.

Phase 24 is complete only when the real production values pass validation, every migration is confirmed, company isolation is tested, and no development URL, placeholder, or privileged credential remains in the installed application.

## Current safe limitation

This package cannot activate or modify the production Supabase project by itself because real credentials and project ownership are intentionally not included. Until those values are supplied and the evidence above is completed, Phase 24 is **prepared but not production-approved**.

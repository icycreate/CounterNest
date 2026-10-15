# Install / upgrade this RC1 update
Internal name: CounterNest POS v2.0.0-RC1. Build: 2026-10-15-update1. Use the new source folder as a complete checkout; do not mix files from old packages.

1. Preserve the existing ZIP and take tested PostgreSQL/Storage backups. Use staging first.
2. Inspect the real applied SQL level. Proven original RC1 at 78: apply only file 79, 202610151200_customer_requests_register.sql. Proven v1.55.0 at 77: apply 78 then 79. Earlier/fresh projects follow the verified pending sequence in SUPABASE_MIGRATION_ORDER.md. Read the duplicate-prefix caution in SUPABASE_UPGRADE_GUIDE.md.
3. Pause cash opening and business mutations during the coordinated upgrade. Apply pending SQL once; do not rerun old files. No data deletion or reverse migration is supplied.
4. Deploy the complete frontend to all stations and refresh old tabs/PWAs. The four RC1 account Edge handlers remain required; this update adds no new Edge Function and no messaging provider.
5. Admin: open Settings → Customer Contact Methods, choose permitted methods and save. Catalogue → Display Settings: enable sharing, set the final HTTPS production origin if needed, save, then scan the QR using a logged-out phone. Reprint signage when URL/token changes.
6. Sign in, reach Dashboard, then admin opens Daily Cash → Open Register with station and opening amount. Cashiers cannot declare/change opening cash. Existing open/closed register history is preserved.
7. Complete a controlled anonymous request, staff selected-method contact preparation, audited override, linked scheduled order and one payment/collection. Verify stock, receipt, cash and audit logs. Complete the UAT checklist before real use.

Local setup: supported Node, npm ci, ignored .env.local from .env.example, npm run verify. Keep VITE_ENABLE_DEMO=false in staging/production. No server key belongs in frontend variables.

Do not roll back just the UI to a client that enforces the retired login cash declaration: that RPC is now intentionally revoked and old clients can become stuck. Keep coordinated RC1-update clients or use a reviewed forward fix. Retain all original ledgers and backups.

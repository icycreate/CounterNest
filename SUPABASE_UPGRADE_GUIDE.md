# Supabase upgrade

Build 2026-10-16-consolidated1, version 2.0.0-rc.3. Permanent architecture: Browser → GitHub → Vercel → Supabase Cloud.

1. Take a managed database backup plus private Storage backups. Rehearse in a separate staging project. In-app exports do not back up Auth credentials or Storage binaries.
2. Check applied migration history. The latest delivered RC1 update ends at migration 79. Apply ONLY these pending files, in order:

- 80. 202610151800_ux_workspace.sql — SHA-256 7ca98b9af7a5168da232db1cc4aa5487beb58b35dda8397c25729e63a37067e1
- 81. 202610161200_catalogue_finalization.sql — SHA-256 d058a4a6ba97329be6ee9fca087032f8a41e6478f8b9b54d85567362a614e510

If migration 80 was applied from the earlier working UX source, apply only 81. Never replay prior migrations. Fresh databases apply all 81 files in SUPABASE_MIGRATION_ORDER.md.

3. Migration 80 introduces role workspaces; existing employees default to Cashier. Assign Production/Inventory in Staff without promoting them to Administrator. Migration 81 adds direct acceptance/decline, receipts, optional scheduled dates, kitchen integration and conditional Realtime publication. All tables/RPCs retain scoped authentication/role checks.
4. Deploy the source through GitHub/Vercel after SQL succeeds. Existing authentication Edge Functions remain unchanged. Keep production environment secrets private and never expose a service-role key.
5. Complete UAT for roles/languages, crop/PDF/QR/default branding, direct acceptance/decline/contact restrictions, real deposits, paid reprints, kitchen/planning deduplication, register opening and checkout recovery. Verify Realtime delivery in cloud; 30-second visibility-aware workspace polling remains the fallback.

Legacy request states remain readable; they no longer require manual traversal to accept a new order. Existing linked orders/deposits/receipts are retained. Acceptance itself does not deduct stock. Collection/payment and ingredient/lot completion retain the established audited workflows.

Do not attempt an ad hoc down-migration after new financial writes. Rehearse rollback with managed backup and coordinated application rollback, retaining new ledgers/requests. Public tracking links are private bearer capabilities; keep them with their requester.

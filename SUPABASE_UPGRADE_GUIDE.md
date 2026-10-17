# Install and upgrade RC5

2.0.0-rc.5 • 2026-10-17-operations1

1. Preserve independent database and Storage backups. Rehearse on an isolated Supabase staging project before production; the new in-app restore is not a replacement for platform disaster recovery.
2. Verify the deployed migration history. Delivered RC4 ends at83. Apply 84 ingredient purchasing, 85 production intelligence, 86 workspace recovery and 87 operations/import/permissions, in order. Never replay or edit1–83. Fresh databases use all87. Check MIGRATION_MANIFEST.json and SUPABASE_MIGRATION_ORDER.md.
3. Review the backfilled owner: the oldest active administrator is selected deterministically for existing shops and audited. Resolve ownership with the deployment administrator before using deletion. New business bootstrap establishes owner atomically.
4. Deploy the unchanged four authentication Edge handlers if missing and the new workspace-lifecycle function plus its shared archive module. supabase/config.toml disables gateway verification for these functions because each handler validates JWTs itself. Keep SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY in the Edge environment only. Leave WORKSPACE_PURGE_ENABLED unset/false until a restore rehearsal passes.
5. Deploy source to Vercel with public frontend and tenant-manifest runtime configuration from ENVIRONMENT_VARIABLES.md. Run npm install then npm run build; output dist, API function remains in api/. Reload old browser tabs after service-worker activation.
6. In Workspace review setup, import mappings, permissions and backup health. Configure purchasing approval and verification deliberately; existing shops default to no purchase approval and optional verification for compatibility.
7. Verify private ingredient photos, substitutions, mismatches/overrides, purchase-to-receipt quantities/lots, reservations/shortages, accepted-order links, costs/waste/trace, new-account restore and pending-deletion cancellation in staging. Complete UAT_ACCEPTANCE_CHECKLIST.md before rollout.

Rollback: retain the prior source and backups. Do not roll back by dropping columns/tables or replaying applied migrations. Diagnose and forward-fix in staging. Pause production activity for the upgrade/recovery rehearsal and reconcile stock, cash, orders and counts afterward.

Deploy the new workspace-lifecycle function and redeploy create-staff-account and reset-staff-password for owner-account protections after applying SQL84–87.

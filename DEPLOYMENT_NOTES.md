# RC5 deployment notes

Current source version 2.0.0-rc.5; build 2026-10-17-operations1. RC4 migration baseline83, new files84–87. Deploy SQL in order, then the new workspace-lifecycle Edge handler/shared archive module, then Vercel source. Redeploy create-staff-account and reset-staff-password for the new owner protections. The change-password and change-initial-password handlers remain unchanged. The separate Vercel catalogue-manifest endpoint remains included.

No production data, live accounts or remote deployment were changed while preparing this release. All secret/service keys remain server-only. Keep independent Supabase database/Storage backups and perform staged recovery, owner review, barcode/receiving/production/cash reconciliation, browser/PWA and physical-device UAT. See KNOWN_ISSUES.md for bounded backup/import behavior.

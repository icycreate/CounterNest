# Workspace backup and restore — RC5

Open System & Settings → Workspace → Backup & Restore as Owner/Admin. Create Full Backup retrieves supported business records and internal uploaded files into a versioned uncompressed ZIP. The manifest includes business/date/app/format versions, record counts, file count, CRC and SHA-256; Download Backup also downloads an archive checksum file. Protect the archive: customer and financial data remain readable inside it. Passwords, PIN hashes, API/service secrets, active sessions and authorization grants are excluded.

Supported buckets: product-images, shop-logos, catalogue-media, special-order-references, ingredient-packages, recipe-steps and supply-imports. An unreadable supported file stops the backup. External images, Supabase platform settings and Auth users are outside it. Limit48MB uncompressed; larger estates require platform database/Storage recovery and staging scale tests.

## Restore into a new workspace

Use a newly authenticated account without an existing staff/workspace membership. The business onboarding screen has Restore from CounterNest Backup. Upload ZIP → validate manifest/checksums → review name/date/app/format/counts → confirm preview → verify current password → Restore. Existing workspace IDs and memberships are never overwritten. Record IDs, foreign keys and file folders are remapped; referenced files are uploaded into the new tenant folder. Failed restores roll back database changes and attempt uploaded-file cleanup.

Credentials/authorization are not restored. The new account becomes owner; invite staff again, review role presets and configure public sharing/Auth/platform settings. Historical authentication references are reassigned to that owner; retain the original archive for audit context and source staff-directory information. The restore preserves business snapshots without replaying old production, cash, sale or stock triggers. Legitimate nullable FK cycles are reconnected after dependent records exist; unrelated required source references remain enforced. Verify record counts, stock balances, lots, cash, paid orders, images and new receipt numbering in staging.

## Backup and delete

Only the established owner can request deletion. Generate and download a fresh verified backup, enter current password, type the exact business name, and check both confirmations. The server verifies password, backup age/checksum, current business records and file checksums, then freezes ordinary mutations and customer catalogue access. Any failed/mismatched backup stops deletion.

Pending Deletion provides30 days of recovery. The owner can reauthenticate and cancel; normal operations resume with data retained. Permanent purge remains disabled until a deployment operator explicitly enables WORKSPACE_PURGE_ENABLED after a successful rehearsal. After recovery expiry, the owner must create/download another backup, reauthenticate and explicitly confirm permanent deletion. No browser timer performs deletion. Platform Auth accounts remain outside workspace purge; any reported storage-cleanup failure requires operator follow-up.

# CounterNest POS Operational RC5

2.0.0-rc.5 • 2026-10-17-operations1

Browser → GitHub → Vercel → Supabase Cloud. Built from the delivered RC4 source; no native desktop deployment is included.

## Purchasing and inventory

Private Ingredient Purchase Identification adds brands, package/base-unit quantities, supplier codes, barcodes, original/thumbnail/secondary photos, approved substitutes and buying warnings. Reusable purchase cards appear in ingredient, buying and verified-receiving workflows. Supplier offers retain normalized costs, lead times, availability and quality/reliability inputs; actual receipt history includes package snapshots on new verified receipts. Suppliers never change automatically.

Approval settings support none, above threshold and always. Approved needs convert once to POs. Receiving checks approved barcodes, substitute status and package checklist before calling the existing quantity/lot/FEFO ledger; mismatches require an authorized reasoned override. Mobile buying lists record found/substitute/unavailable states. No-approval and optional verification defaults preserve existing workflows until configured.

## Production and operations

Scheduled batches and accepted orders reserve ingredient requirements without physical deduction. Linked batches replace the same order demand, cancellation releases commitments, and existing production completion remains the physical stock authority. Projected stock combines on hand, incoming POs, reservations and separate forecast demand; suggestions round to approved supplier packs. Recipe costing supports weighted-average or latest approved supplier cost, packaging/labor/overhead, target margin and an explicit price warning. Existing FEFO/recall tracing and new waste summaries connect ingredients, batches, products, sales and linked orders. Stable exception notifications open authorized records.

## Workspace

System & Settings → Workspace contains an eight-step setup checklist, CSV/XLSX map/validate/preview/import, permission presets, full ZIP backup/restore and system health. Imports validate every row and commit atomically with retry keys; opening counts use stock ledgers. Owner/Admin/Manager/Cashier/Production/Inventory/Accounting presets protect owner/admin grants and allow customization of operational permissions. Legacy financial/customer actions retain existing base-role restrictions; Accounting is read-only in this release.

Backups include supported business tables and seven internal upload buckets, a versioned manifest, CRC and SHA-256 checks. Restore requires a new unassigned authenticated account, previews the archive and remaps IDs/file folders into a new workspace. Credentials, login sessions and staff authorization grants are excluded. Staff must be invited again; historical authentication references are reassigned to the restoring owner. Restore does not replay historical stock/cash side effects.

Owner deletion requires fresh password verification, a fresh downloaded validated backup, exact business name and two confirmations. Server checks records/files again and freezes mutations during the final snapshot comparison. The workspace remains recoverable for30 days. Permanent purge is operator-disabled by default and requires expired recovery plus owner reauthentication and explicit confirmation; it never runs from a browser timer.

## Upgrade and verification

RC4 ends at migration83; apply only84–87 in SUPABASE_MIGRATION_ORDER.md, then deploy the new workspace-lifecycle Edge Function with its shared archive module. All83 older files are unchanged. Local production build, database, UI, Edge mocks and release checks are recorded in BUILD_VALIDATION.json. Actual Vercel/Supabase deployment, upload/restore scale, devices, physical printing and native-speaker UAT remain required.

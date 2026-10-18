# 2.0.0-rc.8 — 2026-10-17

- Shared validated theme tokens and tenant-scoped public Catalogue palette, including manifest colors.
- Managed route/layer history, modal-first Back and localized unsaved-edit protection.
- Light auth overrides, Supabase password recovery UI and cleared sign-out branding.
- Storyboard-inspired tagline, glow and wider boot loader; official platform logo retained.
- Actual browser screenshots, regression evidence and one additive theme migration.

# 2.0.0-rc.7 — CounterNest boot experience

Integrated bounded SVG/CSS startup animation, real auth/workspace readiness, light/dark/system and reduced-motion behavior, offline shell assets and current CounterNest PWA icons.

# 2.0.0-rc.6 — Purchasing cleanup

Unified eligible purchase items, explicit resale stock model, verified PO receiving, supplier metadata, shared searches and dynamic favicon. See RELEASE_NOTES.md and PURCHASING_MODEL.md.

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


# CounterNest POS RC4

2.0.0-rc.4 • 2026-10-16-consolidated2

Browser → GitHub → Vercel → Supabase Cloud. The actual source extends the delivered RC3; no desktop installer is included.

- Shared Button supports primary, secondary, success, danger and ghost; newer receipt, acceptance, QR/display, register and purchase-need actions use it.
- Text-only sales and accepted-order receipts center business branding and optional catalogue QR. Both preview and print/PDF use 80 mm geometry with equal padding. Accepted receipt preview uses the actual print document.
- Searchable country/flag/code phone inputs normalize new data and WhatsApp/tel/SMS links. Business phone/timezone/currency select the default country. Entered content is preserved across EN/ES/zh-TW/zh-CN.
- Originals and cropped catalogue images persist separately. Cards use crop; details and portrait PDF default to the full original with containment. PDF offers a crop preference; detail offers full preview.
- Customer PWA uses a persistent tenant-specific Vercel manifest with a public catalogue start URL and four-language install/A2HS guidance. Browser favicon remains CounterNest.
- Direct acceptance/decline, audited contact overrides, real deposits, notifications, role isolation, admin Daily Cash and stock/payment safeguards remain covered by regression tests.

## Upgrade

RC3 databases: apply only 202610161500_original_catalogue_images.sql, then 202610161600_phone_receipt_consistency.sql. Original 81 files remain byte-for-byte unchanged. Back up, rehearse staging, deploy source with Vercel serverless support, configure public Supabase environment values, then perform the UAT checklist. See SUPABASE_MIGRATION_ORDER.md and PWA_CUSTOMER_GUIDE.md.

## Verification limits

Local PostgreSQL/React/build checks are automated. Actual Supabase deployment/Auth/Storage/Realtime, native PWA installation/reopening, physical printing and native-speaker language review require the target environment. Historical cropped-only images cannot recover missing originals. Browser icon selection for tenant app logos depends on platform support.


<!-- RC4 current release notes below supersede older upgrade counts in the retained guide. -->
# Changelog

## 2.0.0-rc.4 — 2026-10-16 consolidated candidate

Direct acceptance/decline and accepted-only pre-order receipts; fresh server quotes, real optional deposits, optional scheduling, exact record navigation and one kitchen queue. Product/gallery crop editor, portrait catalogue PDF cards and neutral default business logo. Removed all catalogue automatic slides and timing controls. Consolidated role dashboards, Realtime notification invalidation, command search, pins, touch/dark-mode improvements and four-language dictionaries. Added migration 81 after the existing UX migration 80; earlier delivered files remain unchanged.

Prior release packages remain available separately with their historical changelogs.

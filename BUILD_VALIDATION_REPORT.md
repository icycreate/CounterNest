# CounterNest RC5 validation

2.0.0-rc.5 · 2026-10-17-operations1

Local dependency install and final npm run verify passed. All87 SQL migrations apply to the local PostgreSQL test engine and all108 database groups pass, including full operational backup roundtrip with exact table-count and stock reconciliation. All83 delivered RC4 migrations retain their original hashes. Only84–87 are new.

All24 role/language component cases and50 production preview routes pass. The translation catalogue has3227 source labels and664 known errors; none of2805 measured labels is missing. Entered business content remains unchanged. Four existing Auth handlers pass mocked execution, including new owner guards in create-staff-account and reset-staff-password; those two require redeployment. The fifth new workspace-lifecycle handler passes separate mocked authentication, password, backup/file, new-account restore and disabled-purge tests.

New database tests cover package privacy, barcode/receiving checks, approvals, supplier comparison/history, reservations without double-counting linked orders, costing, lot/recall/waste projections, custom role restrictions, import validation/retry/ledger effects, tenant isolation, owner protections, pending deletion and disposable expired-recovery purge. ZIP tests cover checksums, CRC, secret exclusion, tenant/UUID/file path remapping and tampering. Existing POS/payment/stock/refund/receipt/PDF/PWA suites continue to pass.

Actual browser QA with fictional fixtures reviewed purchasing identification photos/substitutes/warnings, quantities, the eight-step setup, saved currency/tax, and reason-gated import of a real deflated XLSX file. Backup/restore and disabled danger-zone gates were inspected without real credentials or destructive operations. Screenshot capture succeeded for local visual review; no screenshot file is packaged. See BROWSER_QA_RESULTS.json for exact scope.

These are local candidate checks using mocked Auth/Storage/Edge services, not live deployment certification. Real Supabase/Vercel, realistic backup scale, original photo uploads, device printing/scanning, native PWA installation, screen-reader/mobile and native-speaker acceptance remain unchecked UAT. Permanent purge stays operator-disabled by default. Review KNOWN_ISSUES.md, INSTALL_UPGRADE_GUIDE.md and UAT_ACCEPTANCE_CHECKLIST.md before launch. Separate ZIP validation verifies each packaged source file and both archive checksums.

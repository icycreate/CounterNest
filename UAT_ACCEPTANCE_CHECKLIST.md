# RC11 acceptance

Local evidence: FINAL_CHECK_RESULTS.json, DATABASE_TEST_RESULTS.json, CUSTOMER_EXPERIENCE_TEST_RESULTS.json, docs/validation and RC11_BROWSER_QA.json. Older RC10 screenshot sets are retained as baseline evidence, not recaptured RC11 screens.

- [x] Install dependencies, production build, complete regression and built asset validation (see final reports).
- [x] All prior 91 migration hashes preserved; new migration applies in local PostgreSQL.
- [x] Default artwork, custom-logo helper and dynamic icon integration; bounded boot and light auth regression.
- [x] Standard category translations in all four languages; original product names; Translation card removed.
- [x] Enabled-only business contacts, admin permissions, normalized WhatsApp and unsafe-link rejection.
- [x] Transactional request deduplication, separate device registration, role rejection, server cursors, lease exclusion, frozen/revoked recipients and unregister behavior.
- [x] Foreground three-ring/single-ring synthesis, worker account binding and request deep links in deterministic checks.
- [x] Public custom-cake intake retry and acceptance into original scheduled cake workflow.
- [x] Preserved removal/archive, purchasing/receiving/barcode verification, Calendar, receipts, phone and workspace restore/delete regression.
- [ ] Apply migration 92 and deploy to live staging with two businesses and every staff role.
- [ ] Real business logo upload/removal, icon cache update, gallery originals/crop/storage upload and PDF print.
- [ ] Register two real devices and verify database webhook, retry schedule, foreground ×3, background/closed OS push, exact record links, no cross-business delivery, permissions revoked and expired endpoints.
- [ ] Physical PWA install/relaunch, browser Back, reduced-motion boot and OS badges/sound on target phones/tablets/desktops.
- [ ] Full EN/ES/zh-TW/zh-CN manual UX pass, custom names, dark prices/subtotals/totals/steps/controls and keyboard/focus accessibility.
- [ ] Staging barcode scanners, mismatches/reason audit, purchase-item exclusions, operations Calendar source events and real printer/QR hardware.
- [ ] Verified secret-free backup, isolated relationship remapping restore and recovery-period deletion using disposable workspaces.

- [ ] Refresh the remaining desktop notifications/contact/gallery screenshots on the deployed staging application; local native capture had intermittent compositor failures.

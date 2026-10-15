# Phase 25 — Complete Acceptance Testing

Phase 25 proves the existing CounterNest behavior on the real production configuration and target devices. It does not add new POS features.

Run `npm run acceptance:prepare` to verify the package without production credentials. After Phase 24 is approved, run `npm run acceptance:run`; this requires `.env`, internet access, and the production Supabase project. Record each manual result in `release-evidence/phase25-manual-evidence-template.csv`.

## Test rules

- Use a dedicated acceptance company or clearly marked test records until the final controlled live transaction.
- Record tester, UTC date/time, device, role, result, receipt/reference number, and defect ID.
- A security, company-isolation, missing/duplicate sale, wrong cash calculation, inventory corruption, or unrecoverable-data defect is critical.
- Critical defects must be fixed and retested. Accepted low-risk limitations require an owner, workaround, and review date.

## Access and company isolation

- [ ] Owner signup/onboarding and existing staff sign-in work.
- [ ] Employee cannot access administrator-only screens or protected actions.
- [ ] Administrator invitation, role change, deactivation, and final-administrator protection work.
- [ ] Manager PIN is required for refunds and voids.
- [ ] A second company/account cannot read, export, or change the first company’s records.

## Checkout and receipts

- [ ] Guest cash sale with exact tender produces zero change.
- [ ] Cash above total calculates the correct change on screen and receipt.
- [ ] Cash below total is rejected and creates no sale or inventory change.
- [ ] Card and QR recording remain unchanged.
- [ ] Customer sale earns the configured loyalty points/stamps.
- [ ] Reward redemption produces the correct discount and loyalty balance.
- [ ] Printed/PDF and historical receipts match product total, cash received, change, staff, customer, and payment method.
- [ ] Manual product selection and barcode input work; unknown/out-of-stock products are rejected safely.

## Adjustments and audit

- [ ] Partial refund, remaining refund, and void require manager approval and reason.
- [ ] Cash refund affects Daily Cash; Card/QR refund does not claim external provider automation.
- [ ] Inventory return choice and loyalty reversal/restoration reconcile correctly.
- [ ] Receipt reprint, access changes, cash movements, expenses, and inventory changes appear in the audit log.

## Daily operations and reporting

- [ ] Daily Cash opens with counted existing cash.
- [ ] Cash sales/refunds and cash in/out update expected cash correctly.
- [ ] Closing counted cash produces the correct variance and immutable history.
- [ ] Expense, stock receipt, purchase order, production output/waste, and product-cost workflows reconcile.
- [ ] Management, profitability, Daily Cash, and audit CSV/PDF exports match source records.
- [ ] Backup export and SHA-256 integrity verification succeed.

## Target devices and failure behavior

- [ ] Windows shortcut launches `http://127.0.0.1:4173` after reboot.
- [ ] Android candidate completes sign-in, sale, receipt, refund, Daily Cash, and reporting paths.
- [ ] Internet loss displays the warning and blocks transactional writes.
- [ ] System Print/manual receipt and manual physical cash handling work as fallbacks.
- [ ] No direct printer or physical drawer compatibility is claimed without a tested brand/model.

## Approval

Phase 25 passes only when the automated production report contains no failure, every critical manual test passes on the target Windows computer and Android phone, defects are closed/retested, and management signs the evidence record.

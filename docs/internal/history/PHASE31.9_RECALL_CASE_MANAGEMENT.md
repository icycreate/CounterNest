# Phase 31.9 — Finished-Product Recall Case Management

## Purpose

Phase 31.9 converts a finished-product batch recall into a controlled management case. It adds follow-up and closure controls without changing checkout, refunds, voids, stock allocation, or the Phase 31.8 recall/disposal behavior.

## Deployment

1. Back up the current Supabase project and verify the backup.
2. Apply migrations 1–41 in `SUPABASE_MIGRATION_ORDER.md`. For a database already on Phase 31.8, apply only `202608241300_finished_product_recall_case_management.sql`.
3. Build or reinstall the Windows application with `SETUP_COUNTERNEST_BROWSER_HOST.ps1`.
4. Sign in as an administrator and open **Supply Operations → 31.9 Recall Cases**.
5. Run **Phase 31 Operational Acceptance** and review recall warnings.

Do not apply the migration first in production without testing it against a recent non-production copy.

## Workflow

1. An administrator recalls a finished-product batch in **31.8 Batch Recall** and records a reason.
2. CounterNest immediately removes the unsold batch balance from sellable stock and opens one recall case.
3. Previously affected receipts are snapshotted into the case work list. Named customers begin as **Pending**; guest/no-contact receipts begin as **Receipt only**.
4. Management uses the email/phone links as needed and records the factual outcome and note. CounterNest does not send a message automatically.
5. Remaining quarantined units are disposed through the Phase 31.8 batch record.
6. The case can close only when no receipt action is Pending, quarantine is zero, and a final management resolution note is entered.
7. Closed cases remain visible with every event and cannot be edited or deleted.

## Permissions and evidence

- Only active administrators of the current shop can view or change cases.
- Row-level security isolates all three case tables by shop.
- Direct client writes are not granted; status changes and closure use protected server functions.
- Customer contact details are a recall-time snapshot for controlled follow-up.
- Opening, every outcome update, disposal, and closure are immutable event records.
- The case CSV is evidence for controlled management use; spreadsheet formula-like values are neutralized on export.
- Supply Operations backup exports include all case, action, and event records.

## Closure checklist

- Every affected receipt has a recorded outcome.
- Every contact note states the method, time or result as appropriate.
- Guest/no-contact receipts are explicitly marked **Receipt only**.
- All remaining quarantined units are disposed and documented.
- The final note summarizes contact outcomes, disposal, and management’s conclusion.

## Limitations

The release does not provide automatic email, SMS, delivery confirmation, regulator reporting, or a legal recall template. Management remains responsible for the communication method, privacy handling, jurisdiction-specific reporting, and any external payment or customer-remedy process.

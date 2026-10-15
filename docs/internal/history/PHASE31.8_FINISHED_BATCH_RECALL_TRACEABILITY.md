# Phase 31.8 Workflow — Finished Batch to Sale Recall Traceability

## Purpose

Phase 31.8 connects each newly completed production batch to the receipts that consume its sellable output. Management can quarantine unsold stock, identify affected receipts, contact named customers when details exist, and retain an audited disposal record.

## Install or update

1. Back up the current Supabase project and CounterNest installation.
2. Apply migration 40 in Supabase SQL Editor: `supabase/migrations/202608241200_finished_product_batch_traceability.sql`.
3. Confirm the SQL Editor reports success.
4. Preserve or configure `.env` using `.env.example` on a new installation.
5. Run `SETUP_COUNTERNEST_BROWSER_HOST.ps1`, or rebuild with `npm.cmd ci` and `npm.cmd run build`.
6. Sign in as an administrator and run **Operational Acceptance**.
7. Open **Supply Operations → 31.8 Batch Recall** and review opening/untracked stock.

## Production workflow

1. Schedule production normally.
2. Select **Complete**.
3. Enter sellable output, waste, a finished batch code, and the optional best-before date.
4. Save. Ingredient consumption, finished stock, and the finished-batch record are committed together.

Use a batch code that is also placed on the physical finished goods or their storage label.

## Checkout allocation

Checkout is unchanged for staff. When a sale is saved, CounterNest allocates its product quantities to the earliest usable best-before batch first. Expired and recalled batches are rejected from new checkout allocation.

If product stock exists but usable finished-batch balances do not cover a sale, the database rejects checkout rather than creating false traceability.

## Refund and void workflow

When **Return to inventory** is selected, refunded quantities return to the same finished batch used by the sale. A depleted normal batch becomes active again. A recalled batch remains quarantined and does not increase sellable product stock.

Historical pre-31.8 refunds that have no original batch evidence are returned into a clearly labeled untracked return batch.

## Recall workflow

1. Open **Supply Operations → 31.8 Batch Recall**.
2. Find the affected finished batch and select **Recall**.
3. Enter the management or food-safety reason.
4. Confirm. Remaining units are immediately removed from sellable product stock and quarantined.
5. Select **Trace** to view affected receipts, sale status, quantities, customer name, email, and phone where recorded.
6. Export the CSV if management requires a controlled contact/work list.
7. Follow the business recall procedure outside CounterNest.
8. Record disposal of quarantined units in the batch record.

CounterNest does not automatically email, text, or call customers.

## Traceability limits

- Named customers can be contacted only when their stored details are present and current.
- Guest transactions remain traceable by receipt and purchase time but have no customer contact record.
- Stock existing before this migration is intentionally marked opening/untracked and is not assigned to historical production without evidence.
- The system records operational evidence; it is not a substitute for local food-safety procedures or regulatory advice.

## Daily checks

- Review expiring, expired, recalled, and untracked finished batches.
- Make physical labels match the batch codes recorded in CounterNest.
- Resolve any failed finished-batch ledger check before further sales.
- Export and securely retain supply-operations backups.

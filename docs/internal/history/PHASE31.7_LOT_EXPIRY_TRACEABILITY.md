# Phase 31.7 Workflow — Lot, Expiry, FEFO, Recall, and Traceability

## Purpose

Phase 31.7 connects supplier ingredient lots to the production batches that consume them. It is intended for food-safety checks, expiry control, targeted recalls, and more accurate stock rotation.

## Install or update

1. Back up the current Supabase project and the existing CounterNest folder.
2. In Supabase SQL Editor, apply migration 39: `supabase/migrations/202608241100_ingredient_lot_traceability.sql`.
3. Confirm the SQL Editor reports success.
4. Copy `.env.example` to `.env` and enter the project URL and browser-safe publishable key when installing in a new folder.
5. Run `SETUP_COUNTERNEST_BROWSER_HOST.ps1` with PowerShell execution-policy bypass, or rebuild with `npm.cmd ci` followed by `npm.cmd run build`.
6. Start CounterNest and sign in as an administrator.
7. Open **Supply Operations → 31.7 Traceability** and review the opening/untracked lots created for existing ingredient balances.

## Receiving workflow

1. Create an ingredient purchase order in **31.3 Purchasing**.
2. Open it in **31.4 Receiving**.
3. Enter delivered quantity and actual unit cost.
4. Enter the supplier lot or batch code shown on the packaging.
5. Enter manufacture and expiry dates when supplied.
6. Save. CounterNest updates the ingredient balance and weighted cost, then creates the matching immutable lot record.

The lot code is required. Expired deliveries and a manufacture date later than the expiry date are rejected.

## Production and FEFO

When a production batch consumes an ingredient, CounterNest automatically allocates the reduction across active lots. Dated lots are selected by earliest expiry first; undated opening stock follows dated usable stock. Expired and recalled lots cannot be allocated to production.

If usable lot quantities do not cover the requested production consumption, the database rejects the operation instead of silently using unsafe stock.

## Trace workflow

1. Open **Supply Operations → 31.7 Traceability**.
2. Find the supplier lot.
3. Select **Trace**.
4. Review every production batch, product, allocation quantity, and timestamp that consumed the lot.

This creates a direct supplier-lot → ingredient → production-batch evidence chain. It does not yet track the produced unit through an individual customer sale.

## Recall workflow

1. Select **Recall** for the affected lot.
2. Enter a clear reason from the supplier notice or management investigation.
3. Confirm. Remaining quantity is immediately blocked from production.
4. Open **Trace** to identify affected production batches.
5. Follow the business food-safety procedure for finished goods already produced.
6. Use **Dispose** to record destruction or removal of remaining ingredient stock.

Recall and disposal are audited and cannot be erased from the POS.

## Legacy stock

Migration 39 creates an `OPENING-31.7-…` lot for every existing positive ingredient balance. These lots are marked untracked because the original supplier code and dates were not previously recorded. Administrators may use **Edit** to replace the generated code and add known dates.

## Daily management checks

- Review expiring, expired, recalled, and untracked counters.
- Rotate physical stock to match FEFO guidance.
- Correct supplier lot details before production when possible.
- Dispose expired or recalled stock rather than leaving it in the usable inventory balance.
- Export the supply-operations backup regularly.

## Limitations

- CounterNest provides operational traceability, not legal or regulatory certification.
- It cannot verify that staff physically selected the same lot that the software allocated; storage labels and staff procedures must match the system.
- A live Supabase migration and production acceptance run are required before operational use.

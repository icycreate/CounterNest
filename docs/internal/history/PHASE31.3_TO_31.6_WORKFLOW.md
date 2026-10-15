# Phase 31.3–31.6 Supply Operations Workflow

## Upgrade

1. Download and verify a current business backup.
2. Apply migrations `202608240700` through `202608241000` after the first 34 migrations.
3. Preserve the existing `.env` and copy it into this project folder.
4. Run `SETUP_COUNTERNEST_BROWSER_HOST.ps1`.
5. Open **Operational Acceptance** and run the acceptance check.
6. Open **Supply Operations** and verify suppliers, ingredient balances, currency, and starting costs.

## Purchase and receive ingredients

1. Open **Supply Operations → 31.3 Purchasing**.
2. Add or modify the supplier, including payment terms.
3. Create an ingredient purchase order using expected quantity and expected unit cost.
4. When stock arrives, open **31.4 Receiving** and select the order.
5. Enter each delivered quantity and actual invoice unit cost.
6. Review the displayed cost variance and receive the delivery.
7. CounterNest updates the order, receipt, ingredient stock, weighted-average cost, and inventory audit together.

## Record waste

1. Open **31.5 Waste**.
2. Select ingredient or finished product.
3. Select the reason and enter the quantity and management note.
4. Review available stock and estimated cost.
5. Save to deduct inventory and create the immutable waste record.

For waste generated while completing a production batch, continue using the existing **Production → Complete Batch** workflow so recipe consumption and batch yield remain synchronized.

## Review performance

1. Open **31.6 Performance**.
2. Select the reporting range.
3. Review gross profit, manual waste, purchase variance, production attainment, supplier spend, and waste reasons.
4. Use **Backup** on the Supply Operations page to download the Phase 31.3–31.6 data addendum.

The tracked-contribution value is an internal operational indicator. Continue using formal accounting records for tax filings and financial statements.

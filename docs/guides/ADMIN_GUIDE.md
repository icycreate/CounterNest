# Admin guide
Use the seven sidebar groups to reach sales, kitchen, supplies, reports, operations and settings. Expand a heading to see its pages. Collapse the sidebar with the top control; both preferences are remembered on this browser. Related tools live in section tabs (see README).

Start each day by checking staff access, opening cash, product availability and production shortages. Use Products for master records and Catalogue for customer presentation, variants and promotions. Use audited receiving/production/stock adjustments instead of editing balances around a sale.

Create staff through Operations → Staff with matching temporary password fields. The new user must set a private password before normal work. Admin reset requires the target's shop and matching temporary password, then forces another change. Do not share administrator accounts or include passwords in issue reports.

Daily Cash, Expenses, Sales, Reports and Profitability should reconcile before closing. A closed daily session cannot be reopened through the normal workflow. Investigate discrepancies, retain history and document an adjustment.

Use Deployment / Readiness for validation, acceptance, recovery and release checks. A green local result does not replace staging UAT. Take protected business exports and separate database/Storage backups. Follow the upgrade guide for coordinated station updates.

## Customer requests and cash opening
Configure allowed customer methods in Settings and QR/public origin in Catalogue → Display Settings. See CUSTOMER_REQUESTS_GUIDE.md. Catalogue Requests is the initial tab under Pre-Orders / Custom Cakes. Contact only through the selected method, or use an audited one-time admin override. Confirm before linking to a scheduled order; no stock is reserved at intake.

Explicit sign-in now opens Dashboard. Admin uses Daily Cash → Open Register with station, opening amount and note. Cashiers cannot record/alter opening cash. One shared shop register/day remains the model; legacy first-login declarations are historical only.

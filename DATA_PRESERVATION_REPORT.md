# Data preservation report — RC15

| Check | Result |
|---|---|
| Database tables changed | NO |
| Migrations added | NO (0) |
| Existing migration files changed | NO (94 preserved) |
| Records deleted by this task | 0 |
| Production data reset | NO |
| Existing IDs preserved | YES — no ID or data transformation |
| Historical sales preserved | YES — no production writes |
| Existing customers preserved | YES — no production writes |
| Inventory balances preserved | YES — no production writes |
| Production database accessed | NO |

Evidence: 103 backend/API files hash-identical to RC14; see docs/rc15-validation/preservation-hashes.json. No schema changes were necessary. No database credentials were used. Browser tests use an external QA configuration which replaces the database client with in-memory sample responses. Database tests use a disposable local PGlite instance, not Supabase Cloud.

The local database suite exercises existing workflows and constraints; it is not a snapshot of the business database. Live before/after counts for products, customers, ingredients, suppliers, orders, pre-orders, purchase orders, inventory, recipes and staff were NOT collected. Those counts are pending deployment acceptance; no claim is made that live rows were inspected. This task performed no production mutations.

Upgrade an existing RC14 deployment with frontend files only. Do not run historical migrations, restore a backup, reset, or reseed Supabase for this release. User-triggered workflows still perform their normal writes after deployment; that behavior has not been disabled.

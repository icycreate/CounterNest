# Phase 13 — Product Costs and Profitability

Administrators can maintain a unit production/ingredient cost for each product. Checkout snapshots that cost on every sale item so later cost changes do not rewrite completed-sale profitability. Refund quantities reverse their matching cost snapshots.

The profitability report combines net pre-tax sales revenue, net cost of goods sold, gross profit, recorded expenses, and operating result. Product-level reporting shows quantity, revenue, cost, profit, and margin. Older sales from before Phase 13 remain uncosted and are clearly counted in the warning.

Apply `supabase/migrations/202608180860_profitability.sql` after Phase 12.


# Phase 9 — Management Reports

Phase 9 adds administrator-only operational reporting without changing checkout or historical records.

## Workflow

1. Open Reports as an administrator.
2. Choose a date range of up to 366 days.
3. Run the report.
4. Review gross sales, refunds/voids, net sales, transaction count, payment-method totals, and closed cash-drawer variances.
5. Export the visible summary to CSV or print/save it as PDF.

## Security and data rules

- Report calculations run in Supabase using `get_management_report`.
- The function rechecks authentication, active shop membership, and administrator role.
- Every query is restricted to `current_shop_id()`.
- Employees cannot access financial or cash-drawer reporting through the UI or RPC.
- Reports aggregate retained sales, refunds, and closed drawer records; they do not rewrite source data.

Apply `supabase/migrations/202608180820_management_reports.sql` after the Phase 8 migrations.


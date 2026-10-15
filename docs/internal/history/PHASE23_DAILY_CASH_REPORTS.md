# Phase 23 — Daily Cash Reports

Daily Cash now provides a detailed report for the current open record and every recent closed record. Reports include opening cash, cash sales, cash refunds, cash in, cash out, expected cash, counted cash, variance, timestamps, staff, reasons, and linked receipt numbers.

Managers can export CSV or use Print / PDF. No physical cash-drawer control is included.

Apply `supabase/migrations/202608180930_daily_cash_report.sql` after the Phase 20 migration. The function is administrator-only and restricted to the authenticated administrator's company.

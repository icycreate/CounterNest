# Phase 18 — Launch Readiness and v1.0.0

The administrator Launch Readiness screen checks database availability, business information, administrator continuity, manager PIN configuration, active products, product-cost coverage, backup history, cash-drawer reconciliation, overdue purchase orders, overdue production batches, connectivity, installed-app status, and receipt fallback configuration.

Red failures must be fixed before launch. Warnings require management review and documented acceptance. The final release procedure requires a fresh backup, test-database migration rehearsal, end-to-end acceptance testing, real-device Android testing, and receipt/hardware validation before generating a signed APK/AAB.

Apply `supabase/migrations/202608180910_launch_readiness.sql` last.


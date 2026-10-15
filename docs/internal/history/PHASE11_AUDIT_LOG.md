# Phase 11 — Unified Audit Log

Administrators can review sensitive activity across staff access, cash drawers, refunds/voids, inventory adjustments, and receipt reprints in one read-only screen. Filters support date, category, and text search. Results can be exported to CSV or printed/saved as PDF.

The Supabase RPC enforces the active shop and administrator role, limits requests to 366 days and 500 records, and reads retained source records without rewriting them.

Apply `supabase/migrations/202608180840_unified_audit_log.sql` after the Phase 10 staff migration.


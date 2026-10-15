# Phase 16 — Bakery Production and Waste

Administrators can schedule finished-product batches, record planned quantity and notes, then complete a batch with actual sellable output and waste. Completion atomically increases only sellable inventory and writes an inventory audit entry. Scheduled batches may be cancelled; completed batches remain immutable.

Apply `supabase/migrations/202608180890_production_batches.sql` after Phase 15.


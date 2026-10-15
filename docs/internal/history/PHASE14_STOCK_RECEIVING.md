# Phase 14 — Suppliers and Stock Receiving

Administrators can maintain suppliers and receive stock against a supplier, product, quantity, unit cost, invoice/reference, and note. Receiving atomically creates an append-only receipt, increases inventory, optionally updates the product’s future unit cost, and writes an inventory audit entry.

Completed-sale cost snapshots remain unchanged. Apply `supabase/migrations/202608180870_stock_receiving.sql` after Phase 13.


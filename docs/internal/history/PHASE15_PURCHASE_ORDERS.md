# Phase 15 — Purchase Orders

Administrators can create multi-item supplier purchase orders with expected dates, supplier references, notes, quantities, and unit costs. Orders remain append-only and transition from Ordered to Received or Cancelled.

Receiving an order atomically increases every product’s stock, updates its future unit cost, creates receiving records, and writes inventory audit entries. Partial receiving is intentionally deferred to a later enhancement.

Apply `supabase/migrations/202608180880_purchase_orders.sql` after Phase 14.


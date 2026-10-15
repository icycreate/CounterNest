# CounterNest POS v1.54.0 — Phases 36.0–36.9

Continues the v1.44.0 browser/LAN release and its media, promotion, synchronization and analytics functions. Requested phase labels expand the earlier 36.0/36.1 milestone; earlier files remain historical.

- 36.0: Catalogue Detail View & Standalone Display.
- 36.1: Advanced Catalogue Search & Filtering.
- 36.2: Product Variants & Independent Pricing.
- 36.3: Combo & Bundle Management.
- 36.4: Customer Order Number & Preparation Screen.
- 36.5: Customer Ready Display.
- 36.6: Pre-Orders & Pickup Scheduling.
- 36.7: Custom Cake / Special Order Module.
- 36.8: Production Demand Forecast.
- 36.9: Low Stock & Production Shortage Alerts.

Transactional integration preserves the existing master Products, Customers, sales, receipts, recipes, production, daily cash, audit and staff architecture. New variant and combo identities are snapshots/child records, not duplicate product masters. Bundle receipts store component lines; refunds restore the correct stock ledger. Scheduled quotes/deposits become one final sale. New helper RPCs are explicitly revoked from API roles; all ten new tables have RLS.

Added ten migration files after level 67 (68–77). Updated version, cache version, browser host verification, source ZIP packaging and reproducible database regression tests. No native desktop runtime, tray, installer or desktop deployment path is included.

Customer profiles now open linked scheduled-order and sales history. Frontend filter tests cover combined variant price ranges, label filters and an HTTP-LAN UUID fallback.

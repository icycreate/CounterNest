# v1.44.0 — Phases 35.8–36.1

- 35.8: Eight-photo product galleries, primary image selection, center-square crop preview, 1600-pixel resizing/JPEG compression, label images and gallery removal without deleting historical assets. Uses the existing product records and a shop-scoped Storage upload policy.
- 35.9: Fixed-price and percentage promotions, timezone-aware start/end scheduling, featured promotion display, automatic price reversion, promotion PDF scope and an append-only pricing audit table. Server-calculated prices carry through selection snapshots, checkout, receipts and existing sales/accounting reports.
- 36.0: Five-second catalogue/customer/POS pricing refresh, new-product/availability propagation, quote validation before payment, aggregate option stock protection and atomic customer selection-to-sale linkage. Existing regular-price editing remains separate from effective checkout prices.
- 36.1: Anonymous viewport impressions, featured snapshots, selection counts, paid conversion, abandonment proxies, sold-out observations, category performance, rarely selected products, analytics CSV and price-change history.
- Removed desktop runtime, installer dependencies, packaging configuration, installer source/build scripts, shortcut installation path and desktop acceptance documents. Browser/LAN host launchers remain.
- Fixed baseline TypeScript errors in optional shop handling/category updates and moved staff password reset into the rendered page.
- Added migrations 64–67, reproducible PostgreSQL integration tests and a browser-release verification command. Full TypeScript/Vite production build passes.

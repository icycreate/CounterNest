# Phase 35.7 — Catalogue Presentation & Customer Experience

Release: **CounterNest POS v1.40.0**  
Database migration: **63 — `202610121100_phase35_7_catalogue_customer_experience.sql`**

## Customer presentation

The protected same-network customer view now reads the dedicated catalogue presentation fields while continuing to use the Products master for price, stock, active state and images. It supports:

- catalogue title and subtitle;
- category navigation and search;
- category display order inherited from Products → Manage Categories;
- Featured, New and seasonal badges;
- customer descriptions;
- automatic stock sold-out state plus administrator manual sold-out override;
- responsive full-screen tablet/customer-display layout;
- protected customer URL and QR code from Catalogue Settings;
- QR inclusion in catalogue PDF/print exports.

## Same-price option labels

Administrators can add option labels such as **Small / Medium / Large** or **Vanilla / Chocolate**. In Phase 35.7 these labels do **not** create separate SKUs, prices or inventory balances. Every option shares the base product's price and physical stock.

The customer must choose a valid active option when the catalogue product has options. The option is carried through the request queue, loaded into the POS cart and preserved on the sale receipt line snapshot. Aggregate stock validation prevents several option lines for the same product from overselling one shared stock balance.

When catalogue options are changed, old labels are retained as inactive history so an already-submitted customer request can still be traced and completed safely.

## Price-promotion boundary

Phase 35.7 deliberately does **not** add display-only promotional prices. A price shown to the customer must agree with server checkout, receipt, inventory and profitability records. The price-changing promotion engine remains planned for Phase 35.9, where it can be implemented end-to-end rather than as presentation-only data.

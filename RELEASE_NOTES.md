# CounterNest POS consolidated release candidate

Version 2.0.0-rc.3 · Build 2026-10-16-consolidated1

This release consolidates the UX enhancements with catalogue and pre-order finalization. The app remains Browser → GitHub → Vercel → Supabase Cloud.

- Role-aware homes, permission-filtered actions/search, Ctrl/Cmd+K, notifications with Realtime invalidation and polling fallback, private pins/recent pages, Light/Dark/System and four language preferences.
- Categorized collapsible sidebar with Loyalty, Forecast / Shortages and Customer Display Setup visible in their approved groups. Daily Cash opening stays administrator-only after login.
- Neutral CounterNest default logo, dynamic company identity, touch targets, focus indicators, accessible dialogs and bounded queries.
- Product and gallery uploads require crop approval before becoming saved images. The editor shows original/crop overlay, zoom/framing, reset, preview and original download. Output is an optimized JPEG. Existing files are preserved.
- A4/Letter catalogue PDF defaults to portrait photo cards with name, authoritative variant/promotion prices and a short description; business/default logo and catalogue QR remain available.
- Standalone catalogue detail, gallery, language selector, search, filtering, fullscreen and data refresh remain. All automatic slide/category/product rotation and their settings are removed.
- New/legacy unaccepted requests now offer direct Accept Order / Decline Order. Acceptance verifies a fresh server quote, accepted items/quantities, optional pickup/deadline, customer instructions/private notes and an optional deposit actually received through the existing audited ledger. Decline requires an audited reason. No long status sequence is required.
- Acceptance creates one linked order and feeds the shared kitchen queue, production overview and existing planning, without reserving/deducting stock or manufacturing duplicate jobs. Normal payment remains authoritative.
- Accepted-only Pre-Order Receipt supports browser printing/Save as PDF, customer contact/items/variants/prices/deposit/balance/pickup/accepted-by and safe branding. Staff notes remain private. Paid reprints use actual recorded sale totals and zero remaining balance.
- Six editable contact templates and selected-method restriction remain, with a reasoned administrator override. No communication is sent automatically.

The first 79 delivered migrations and migration 80 from the current UX source remain unchanged. Fresh installs apply 81 migrations; installations at delivered migration 79 apply only 80+81, or only 81 if 80 is already applied. Read the upgrade guide and validation report. Live cloud/device acceptance is still required before production.

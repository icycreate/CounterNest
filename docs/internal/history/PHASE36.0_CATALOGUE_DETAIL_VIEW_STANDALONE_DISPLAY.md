# Phase 36.0 — Catalogue Detail View & Standalone Display

Open a product card to inspect the large image, swipe/thumbnail gallery, full customer description, category, current price/promotion, availability, badges, options/variants and product/allergen notes. Close / Back and Escape return to the grid.

Variants / Combos / Displays → Displays supplies dedicated customer, catalogue-display and ready-board URLs. Catalogue-display mode has no selection/cart or staff sidebar. Fullscreen is initiated by a user gesture; TV auto-slide cycles filtered product details. Detail idle return and slide timing are configurable. Screens poll every five seconds. QR opens the customer catalogue on a phone.

Use /?catalogue_display=TOKEN (or /catalogue-display?token=TOKEN) on the commissioned LAN hostname. Add &tv=1 to start slide mode. Confirm fullscreen, touch swipes, thumbnails, QR and idle timing on the target hardware.

This phase is part of v1.54.0. Upgrade from v1.44.0 with migrations 68–77; read PHASE36.0_TO_36.9_UPGRADE.md and the UAT checklist.

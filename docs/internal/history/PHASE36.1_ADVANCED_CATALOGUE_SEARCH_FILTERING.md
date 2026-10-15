# Phase 36.1 — Advanced Catalogue Search & Filtering

Product-name search combines with category, tags, minimum/maximum price, available/sold-out status, Featured/New/Seasonal/Promo badges, allergen exclusion and configured dietary labels. Reset filters restores the full view.

Catalogue → Edit Catalogue Details → Search labels & product notes maintains tags, allergens, dietary labels and notes on the existing Product master. Vegan, Vegetarian and Gluten-Free are management-entered labels; no certification is inferred. Variant products match when any active variant price falls inside the price range and any active available variant for availability.

The same component powers customer, standalone and POS catalogues. Combos are hidden while tag, allergen, dietary or product-badge filters are active because a choice combo has no single fixed allergen/dietary composition. Product fields are never copied into a second master table.

This phase is part of v1.54.0. Upgrade from v1.44.0 with migrations 68–77; read PHASE36.0_TO_36.9_UPGRADE.md and the UAT checklist.

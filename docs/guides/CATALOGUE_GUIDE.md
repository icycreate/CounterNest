# Catalogue guide
Products holds the master product. Catalogue controls customer visibility, order, category, descriptions, primary/gallery images, notes, allergens, dietary labels, featured/new/seasonal badges and sold-out status. Hide discontinued products rather than deleting sales history.

Use Variants & Bundles for options and combos. Each active variant has its effective price/availability; a master product price is not necessarily the checkout price. Promotions support fixed prices or percentages with start/end times. Preview both small and large variants and verify receipts after changes.

Customer detail shows the large image, gallery, full description, badges, regular/current price, discount, availability, options and customer notes. It does not show internal cost, margin, recipes, suppliers or audit data. Allergen exclusion is a browsing aid; staff must still confirm dietary safety.

Under Display Settings enable and share the token-protected customer link. /catalogue-display?token=... supports kiosk and TV modes, full-screen, automatic refresh, optional slide rotation and idle return. A naked route without a valid enabled token is not a public shop directory. Rotate/disable the token when needed; treat it as a share link.

Use Export PDF for Customer Catalogue or Compact Price List. Choose all, available, featured, promotions, category or selected products, include desired images/descriptions/logo/QR, then A4/Letter and portrait/landscape. Inspect print preview before saving. The PDF is a dated snapshot; scheduled prices can change after printing.

## QR and pre-order requests
Use Display Settings for View QR, Save QR Image, Print QR, Copy Catalogue Link, Open Customer Display and Preview Catalogue. Saved public base URL → VITE_PUBLIC_APP_URL → current origin is the order of precedence. Saving URL/contact settings or rotating the token refreshes the QR/settings views. Share printed PNG/PDF codes only after saving and scanning them. No app install is required.

Normal tokenized catalogue/display links can take pre-order requests when enabled. Kiosk/TV remain display-only. Customer chooses variant, quantity, more items, name and one enabled method, adds notes and reviews before submitting. No initial pickup/payment/stock reservation. Read CUSTOMER_REQUESTS_GUIDE.md for request recovery, staff review and linked fulfillment.

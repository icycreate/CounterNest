# CounterNest POS v1.3.2 — Phase 30.1

- Restored visible action colors and labels for the Void Sale and Confirm Refund buttons.

- Restored the visible primary styling and label for Add Product beside Manage Categories.

- Fixed combined front/back card printing to remain on one sheet instead of creating an extra page during named-page transitions.
- Replaced printable loyalty balances with one separate on-screen loyalty progress card containing points and a visual stamp row.
- Excluded points and stamps from physical/PDF membership cards.
- Synchronized the configured stamps-required value across Loyalty settings, Customers, checkout, and Cards.

- Fixed product-image uploads after migrations 23 and 24 by using normal inserts for unique filenames instead of Supabase Storage upsert mode.
- Removed the unnecessary upsert permission requirements and corrected the upload guidance message.

- Added a loyalty-card-only balance panel showing the selected member's current stamp count and points earned.
- Included the balance panel in screen, physical print, and combined PDF layouts without changing customer or employee cards.

- Added a configurable point rule: percentage of eligible spending (for example 5%) or points per currency unit.
- Added configurable stamp rules: one stamp when a sale reaches a minimum, or one stamp for every configured amount spent.
- Added live examples explaining the result of each earning rule and persisted the administrator's rule representation.

- Added administrator product-category management: add, rename, and delete categories.
- Added reward deletion while preserving historical reward transaction references safely.
- Added administrator-issued customer points with a required reason, expiration-policy support, and loyalty transaction audit records.
- Added clear in-app instructions for redeeming rewards during checkout.

- Fixed the remaining product-image RLS violation when `staff_profiles` row-level security hid the administrator record from the Storage policy.
- Added migration 24 with a narrowly scoped security-definer authorization helper and recreated the product-image policies around it.

- Changed validation to read the expected migration count from `RELEASE_MANIFEST.json`, preventing the same packaging mismatch in later updates.
- Updated the migration-order guide and acceptance checks for migrations 22 and 23.

- Fixed product-image uploads that failed with a Supabase row-level security violation.
- Added migration 23 to recreate the public product-image bucket and shop-scoped administrator write policies safely.
- Added client-side JPG, PNG, WebP, and 5 MB validation plus a clearer missing-migration message.

- Fixed manager PIN creation on Supabase projects where `pgcrypto` is installed in the `extensions` schema.
- Fixed the same schema resolution for manager authorization during refunds and voids.
- Added migration 22 (`202608190300_manager_pin_pgcrypto_fix.sql`) for existing databases and corrected the original migration for fresh installations.

- Aligned the QR code's right edge with the barcode's right edge in screen, print, and PDF layouts.
- Removed the compact-logo padding override and added an explicit circular mask so the saved logo fills the circle instead of appearing as a square inside it.

- Moved the card QR code to the right on screen, print, and combined PDF layouts.
- Put the barcode in a dedicated bottom container with equal side margins so generated barcode dimensions cannot push it outside the card.

- Added automatic empty-background trimming so uploaded logo artwork fills its crop instead of retaining large file margins.
- Applied the same saved crop edge-to-edge in every business-logo location: sidebar, mobile header, onboarding, login, Settings, receipts, and cards.
- Kept manual zoom and positioning, with an option to turn automatic trimming off for logos that intentionally use their full background.

- Refined the card front with the QR code on the left and the barcode fitted and centered along the bottom.
- Changed Save as PDF to place the card front and back together on one A4 page.
- Added an interactive square business-logo crop with zoom and horizontal/vertical positioning; only the selected crop is uploaded.

- Added stable issued-card records for customer, loyalty, and employee cards.
- Added real QR and Code 128 barcode output using the same Card ID.
- Added elegant preset colors, custom color selection, automatic contrast, and three card treatments.
- Added separate, CR80-sized front and back printing with corrected safe margins.
- Added business number to Shop Profile and the card back.
- Added a mandatory once-per-business-day staff opening-cash declaration.
- Added an administrator view of today's staff cash declarations without changing the management Daily Cash calculation.
- Fixed customer creation after multiple staff accounts exist. The customer form now uses the authenticated workspace's loaded shop ID instead of an ambiguous staff-profile lookup and displays server errors inside the dialog.

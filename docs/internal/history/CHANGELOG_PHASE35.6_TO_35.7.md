# Changelog — Phases 35.6–35.7 / CounterNest POS v1.40.0

## Added

- Administrator Catalogue navigation and management page.
- Customer description, catalogue visibility, featured flag, manual sold-out override and display order.
- Catalogue title/subtitle/PDF footer settings.
- Customer-ready print/PDF export and compact price-list export.
- A4/Letter and portrait/landscape PDF/print controls.
- Optional business logo, photos, descriptions, price, availability, barcode/product code and customer QR in exports.
- Featured/New/seasonal customer badges.
- Same-price catalogue option labels such as size or flavour.
- Customer option selection carried to targeted POS request, cart and receipt line snapshot.
- Shared-stock aggregate validation across option lines.
- Category up/down ordering in Products → Manage Categories; catalogue follows the same order.
- Password show/hide controls.
- Confirm-password validation for direct staff creation, initial password replacement, self-service password change and administrator reset.
- Staff self-service password change with current-password verification.
- Administrator staff password reset with forced next-sign-in replacement and audit record.
- New Edge Functions `change-password` and `reset-staff-password`.

## Changed

- `create-staff-account` and `change-initial-password` now also validate confirmation server-side.
- Customer display catalogue RPC returns presentation metadata and option labels.
- Customer-selection queue/claim/fulfillment payloads preserve option labels.
- Checkout accepts validated option labels and stores them in the receipt product-name snapshot.
- Product cart logic now caps aggregate quantity across several option lines to the physical product stock.

## Database

- Migration 62: Catalogue/account-security catalogue foundation.
- Migration 63: Customer catalogue presentation, options and checkout integration.
- Total migration count: **63**.

## Deferred

- Price-changing promotional campaigns remain Phase 35.9. Phase 35.7 never shows a promotional price that is not enforced by checkout.

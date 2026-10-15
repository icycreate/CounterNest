# Phase 34.3 — Customer Selection Display & Supply/Import Photos

CounterNest POS v1.26.0 remains an internal same-network application with Supabase Cloud as the authenticated backend. Phase 34.3 adds two operational capabilities without turning the customer display into a checkout terminal.

## 1. Customer product-selection screen

### Purpose
Give a customer-facing tablet/display a simple catalog of active products. A customer can select products and quantities, choose a configured cashier destination such as **Main POS** or **Sub POS 1**, and send the selection to staff.

### Security and sale authority
- The customer screen uses a long, rotatable capability token rather than a staff login.
- The token exposes only the customer catalog and request-submission RPCs.
- Direct table access remains blocked by RLS.
- The screen cannot take payment, apply a discount, redeem loyalty, reserve stock, alter inventory, or create a sale.
- The cashier remains responsible for checking current price/stock and completing checkout.

### Setup workflow
1. Apply migration 54 after a verified backup.
2. Administrator opens **Customer View Setup**.
3. Enable the display and configure 1–12 station destinations.
4. Each POS workstation must use the same station label in **POS Hardware Setup**.
5. Copy/open the generated customer display URL on the approved customer-facing device.
6. If the device/link is lost or shared, use **Rotate Link** to invalidate the old token.

### Customer workflow
Customer browses/searches products → selects quantity → chooses target POS → optionally enters a name/pickup note → sends selection → receives a request number.

### POS workflow
Target POS polls Supabase approximately every four seconds → a global notice appears on any authenticated page → staff opens **New Sale** → reviews pending request → starts with an empty cart → **Load into Cart** → CounterNest re-checks the current product list/stock → cashier completes the normal sale.

A request can also be dismissed with an optional reason. Loaded/dismissed requests preserve staff/timestamp evidence in the database.

## 2. Supply/import inventory photo

### Purpose
Allow management to preserve a photo of a supplier invoice, packing slip, delivered cartons, or other supply/import evidence alongside an inventory receiving record.

### Supported receiving areas
- Finished-product **Stock Receiving** (`stock_receipt`)
- Ingredient **Supply Operations → Receive Delivery** (`ingredient_purchase_receipt`)

### File policy
- JPG, PNG, or WebP
- Maximum 8 MB
- Stored in private Supabase Storage bucket `supply-imports`
- Shop-folder isolation enforced by Storage policies
- Administrator-only metadata/read access
- View action uses a short-lived signed URL

### Transaction behavior
The inventory receipt is the authoritative business event. After receiving succeeds, CounterNest uploads and registers the optional photo. If the photo upload fails, it does **not** roll back or duplicate the already-successful receiving transaction; the user receives a warning and can retain the valid inventory record.

This build attaches the image as evidence. It does not perform OCR or auto-create inventory quantities from the photo.

## Migration
`202608301300_phase34_3_customer_selection_supply_photos.sql` — migration 54.

The migration creates the customer display configuration/queue/items, secure RPCs, supply attachment registry, private storage bucket/policies, and stock-receiving attachment counts.

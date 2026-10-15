# CounterNest POS v1.5.0 - Phase 30.4

## Added

- Camera barcode scanning in New Sale for a phone rear camera or computer webcam.
- A product food-icon picker with bakery, meal, fruit, and drink emoji choices.
- Supabase migration 28 to store each product's selected emoji.

## Improved

- Product names wrap on catalog cards instead of being shortened with an ellipsis.
- An uploaded product image remains the first display choice. The selected emoji is used when the product has no image.

## Setup

1. Apply `supabase/migrations/202608200100_product_emoji.sql` in the Supabase SQL Editor.
2. Install or update the Windows release.
3. Allow camera access when CounterNest asks for it.

Camera access works on localhost and secure HTTPS installations. A browser may block camera access on an ordinary unsecured network address.

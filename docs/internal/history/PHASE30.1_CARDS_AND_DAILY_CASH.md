# Phase 30.1 — Elegant Cards and Staff Daily Cash

## Activation

Apply migration 21 after all Phase 30 migrations:

`supabase/migrations/202608190200_cards_staff_daily_cash.sql`

No new Edge Function is required. Keep both Phase 30 functions deployed.

## Cards

- Customer, loyalty, and employee cards receive stable server-backed Card IDs.
- The QR code and Code 128 barcode both encode the same Card ID.
- Administrators can save a separate color and style for each card type.
- Presets: Espresso, Burgundy, Forest, Navy, Charcoal, and Champagne; a custom color picker is included.
- Light or dark text is selected automatically for contrast. QR and barcode stay black on white.
- Front contains only card type, person name, Card ID, QR code, and barcode.
- Back contains business logo, business name, business number, and address.
- Use **Print Front** and **Print Back** separately. In the browser print dialog, disable headers and footers, use 100% scale, and select the card printer's CR80/85.6 × 53.98 mm media.
- Enter the business number under **Settings → Shop Profile**.

## Staff first login of the day

After authentication and any required initial password change, every active staff member must record an opening-cash amount once per business date. Zero is accepted. The business date follows the shop timezone stored in Settings.

The declaration is append-only and unique per staff member/day. It is a reporting reference; it does not modify the administrator-controlled Daily Cash expected balance. Administrators can review today's staff declarations at the top of **Daily Cash**.

## Acceptance checks

1. Apply migration 21, rebuild, and restart the POS.
2. Sign in as two different staff users; each receives the prompt once that day.
3. Sign out and back in; the prompt must not repeat for the same staff member/date.
4. Confirm the administrator sees both entries in Daily Cash.
5. Issue all three card types and confirm Card IDs remain stable after reload.
6. Scan each printed QR and barcode and confirm both return the printed Card ID.
7. Print front and back at 100% scale with browser headers/footers disabled; verify no clipping inside the physical card safe area.
8. Save different styles for the three card types and confirm they persist after reload.

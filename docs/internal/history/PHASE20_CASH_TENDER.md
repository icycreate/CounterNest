# Phase 20 — Cash Received and Change

Cash checkout now opens a tender window before the sale is completed. The cashier enters the physical cash received. The POS displays the product/order total and calculates `change = cash received - total`.

- Cash below the total is rejected.
- Card and QR checkout are unchanged.
- Supabase validates the amount and calculates change again on the server.
- Cash received and change are stored on the sale and shown on printed, PDF, emailed, and historical receipts.
- Tender values can only be recorded once and only by the salesperson who completed the cash sale.

Apply `supabase/migrations/202608180920_cash_tender.sql` after all Phase 19 migrations. Existing receipts remain valid and simply show no cash-tender breakdown.

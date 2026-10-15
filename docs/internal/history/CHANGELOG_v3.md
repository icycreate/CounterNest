# ChubbyLu Bakes POS — v3 Receipt Phase

## Added

- Receipt preview immediately after successful Cash / Card / QR checkout.
- Receipt number, date/time, salesperson, optional customer, business logo/contact information, itemized lines, subtotal, discount/reward, tax, total, and payment method.
- Loyalty activity on receipt: points/stamps earned, redeemed, and post-sale balances when available.
- Print Receipt and Save PDF actions using the browser print workflow.
- Email Receipt action for customers with an email address (opens the device mail app with a receipt summary).
- Sales history now includes receipt numbers and a View Receipt action.
- New Supabase `get_sale_receipt(...)` RPC for shop-scoped historical receipt retrieval.
- Receipt snapshots on `sales` preserve business/staff/customer/reward details from the time of checkout.
- `sale_items.line_no` preserves receipt item order for new transactions.
- Settings now include business address, phone, email, receipt currency, timezone, and customizable receipt footer.
- Current POS/dashboard/customer/report monetary formatting follows the selected shop currency in the updated screens.

## Supabase migration

Run `supabase/migrations/20260816_receipt_system.sql` after the v2 database migrations.

## Notes

- Old uploaded business-logo objects are retained when the current logo changes/removes so historical receipt snapshots can continue referencing the prior logo URL.
- Fully automatic email delivery remains a later phase; v3 uses the device email app and does not require a transactional email provider.

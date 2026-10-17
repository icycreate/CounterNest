# RC6 target-environment UAT

Run after staging migration 88 and before production trading. Use fictional records and record operator, timestamp and evidence. Local automated results are separate from this checklist; unchecked items below are not production sign-off.

- [ ] Confirm baseline hashes and backup; all 88 migrations apply in order on a fresh project and migration 88 applies alone after RC5.
- [ ] Existing products remain Made In-House; existing ingredient quantities, costs, images, suppliers and history are unchanged.
- [ ] Chocolate Cake is absent from PO/receiving selectors; direct product IDs and retired RPCs cannot receive supplier stock.
- [ ] Flour/Cream, Cake Box, Labels and an explicitly marked Bottled Drink appear in the correct item filters and can be ordered/received.
- [ ] Admin-only resale opt-in requires a reason and audit user/time/old-new values; inventory/cashier/foreign-tenant attempts fail.
- [ ] Bottled Drink remains available in POS/Catalogue if enabled. Receiving adds sellable stock once; a sale reduces stock once; exact checkout/receipt retries do not repeat stock changes.
- [ ] Made-in-house production consumes its recipe ingredients once; completed/retried jobs do not double deduct. Recipe shortages create ingredient needs, not cake purchase needs.
- [ ] Purchase cards appear in Needs/PO/mobile buying/receiving; original/secondary photos, brand, package size, unit, SKU, barcode, substitute and Do Not Buy notes are readable.
- [ ] Preferred and alternate supplier selections, supplier-specific SKU/price/package/minimum order/lead time are retained; receiving does not switch the preferred supplier.
- [ ] No-approval, threshold and always-approval modes behave correctly. New Purchase Order creates a pending need when approval is required; only authorized staff approve it with a reason.
- [ ] Preferred barcode shows Approved Item; approved substitute is recognized; mismatches and failed supplier/brand/size/condition checks stop receiving without an authorized reasoned override.
- [ ] Receiving compares expected vs received item, supplier, quantity, cost, lot and expiry. Partial receiving, over-receiving rejection, exact retries, changed retry rejection and rollback leave consistent balances.
- [ ] Expired/recalled resale lots cannot be sold. Test inspected returns and manual adjustments with the business lot/expiry procedure.
- [ ] SearchField layout/focus/icon/height works on desktop and phone, in light/dark modes, across Products/Catalogue/Customers/Pre-Orders/Inventory/Ingredients/Suppliers/PO/Receiving/Recipes/Production/Reports/Staff/Audit/Expenses/global search.
- [ ] EN/ES/zh-TW/zh-CN labels and errors work; business names/item names/notes remain unchanged.
- [ ] Upload/change/remove business logo; verify favicon/title/fallback after refresh, including signed storage URLs. New clean workspace uses CounterNest.
- [ ] Source ZIP excludes .env/.env.local/node_modules/dist and desktop installers; clean npm install and npm run build succeed.
- [ ] Export/restore a new workspace with resale products, linked purchase items, lots and receipts; IDs remap, balances match, and no receiving/sale effects replay.
- [ ] Record real Supabase RLS/storage/Edge results, concurrent-session receiving/sale behavior, browser/device versions and scanner/printer checks before release sign-off.

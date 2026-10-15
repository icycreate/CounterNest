# RC1 → RC2 acceptance checklist

Local automated checks are recorded in BUILD_VALIDATION.json. This checklist remains to be signed off on real Supabase/Vercel and devices.

- [ ] Install/build cleanly from ZIP, confirm dist, private repository and ignored environment/dependency/build files.
- [ ] Supabase applied migration level verified; only pending files run once; historical sale/customer/lot counts and receipt snapshots match before/after.
- [ ] All 43 staff routes load on direct URL/refresh; navigation and Back/Forward work. Test desktop, tablet, phone and installed browser PWA.
- [ ] Staff login/password show/hide, owner signup/email confirmation, onboarding, employee invite, temporary-password forced change and auto-logoff.
- [ ] Each Edge Function rejects unauthenticated/inactive callers, role violations, foreign-shop targets and mismatched passwords; change rejects wrong current password; never logs passwords.
- [ ] Two shops cannot read/update one another's products/customers/sales/recipes/stock/scheduled orders/ledgers/storage/audits. Employees cannot perform admin actions.
- [ ] Main POS and Sub POS target labels route selections correctly. Daily opening cash, tender/change, card/QR, rewards, cash movement and expenses agree with reports.
- [ ] Customer gallery/detail shows full description, category, normal/promo prices, percentage, badges, availability, options, dietary labels/allergens/notes; swipe/close/Escape work. No cost/margin/supplier/staff data.
- [ ] Protected catalogue/kiosk/TV/ready routes hide staff controls. Missing/disabled/rotated share tokens fail. Five-second catalogue refresh, TV slides, inactivity return, fullscreen and phone QR work.
- [ ] All catalogue filters and PDF scopes/layouts work; A4/Letter and both orientations print; saved PDF images/QR/variant prices/availability match current catalogue. Printed snapshots are dated.
- [ ] Scheduled fixed/percent promotions start/end and automatically revert; stale quotes reject at checkout; customer→POS→receipt→reports→profitability prices agree; price history is audited.
- [ ] Shared variant deducts master stock once. Independent variant deducts own usable FEFO lots only. SKU/barcodes unique. Disabled variants retain history; returns/recalls/disposal cannot resurrect held/expired stock.
- [ ] Fixed/category-choice bundle checkout validates chosen components, deducts each once, allocates exact total and preserves receipt/audit trace; refunds restore correct quantities/value.
- [ ] Kitchen Received→Preparing→Ready→Collected, wait time and payment checks. Ready display reveals order numbers only; polling updates.
- [ ] Pre-order/cake pickup/deadline calendar, customer/variant, quote/deposit/balance/cash tender, private reference image, notes and idempotent payment/production linkage.
- [ ] Conversion/yield/scaling/costing, receiving/suppliers/purchase orders, approved production, substitutions/variance, FEFO/expiry/recall traceability still work.
- [ ] Forecast explains recent weekday demand/pre-orders/stock; management approval required; forecast alone never deducts stock. Shortage quantity/severity/jobs/supplier/last price, resolve/dismiss/audit correct.
- [ ] Customers/loyalty/history, reports/profitability, schedules/attendance, tasks/checklists/alerts/escalations, backup/export and audit operations pass role-specific business UAT.
- [ ] Receipt/printer/scanner/cash drawer tested on actual hardware with browser/system print fallback; no desktop installer required.
- [ ] Production has VITE_ENABLE_DEMO=false; missing configuration blocks simulated sales. HTTPS/redirect/email/CORS and reconnect behavior tested. Record sign-off/operator/date.


## RC1 specific acceptance

- [ ] All seven groups, persisted open state, compact mode, active parent and mobile keyboard focus pass. Employee direct management URL is denied.
- [ ] Open a product editor, make a sale on another station, then save the description: the current stock remains unchanged.
- [ ] Open a physical stock count, change stock on another station, then submit: stale count is rejected and requires reviewed resubmission.
- [ ] Simulate lost checkout response: retry same intent returns the same receipt; one sale/stock/cash mutation. Reload same tab and recover. Check Sales before another payment if tab/storage is lost.
- [ ] Use two actual concurrent database connections for the same intent and last stock unit; verify exactly one effect and safe rejection/replay. Repeat around refund, production completion and receiving.
- [ ] Temporary-password account cannot read normal shop data or invoke business RPCs before completing initial change. Pending admin cannot create/reset others.
- [ ] Backup schema version and rc1_records include a recent variant, conversion, preorder and checkout; no password/PIN hash. Separate full recovery drill passes.
- [ ] Review known issues, record defects with reproduction/evidence, and rerun affected tests in RC2. v2.0.0 approval follows successful RC2 acceptance.

Sign-off: release/build hash ___; staging URL ___; Supabase project/migration level ___; operator/date ___; devices/browsers ___; blockers ___; RC2 outcome ___; stable-release approval ___ .

## RC1 request/register update acceptance

- [ ] Verify migration level; confirmed 78 receives only new file 79. Compare all 78 old hashes/counts/history before/after.
- [ ] Set final public origin, change it, save and confirm new QR/link/PDF destination; rotate token and verify old QR stops. Restore staging/production values appropriately.
- [ ] View/download/print QR; scan PNG/signage/PDF from Android/iPhone with no staff login/install. Load optional receipt QR before printing.
- [ ] Normal display URL allows requests; kiosk/TV have no POS/staff controls or request forms. Preview Catalogue disables submission. Idle return toggle, gallery and TV refresh remain correct.
- [ ] Select variant/quantity, add more products, edit/remove items, enter name and one enabled method, notes, review and submit with no pickup required. Staff receives exact item/price/contact preference; no stock/cash/sale changes at intake.
- [ ] Lose submission response, reload the same tab and retry the same saved intent: one request. Definitive stale price rejects; confirm new quote without duplicate intake. Inspect session-data privacy/clearing.
- [ ] Disabled methods cannot be chosen or forged at RPC; invalid token, body types, foreign products, quantities and repeated submissions are rejected.
- [ ] Employee sees only preferred contact action; no alternate buttons. Admin override requires reason/destination and appears in Request History and Audit Log; customer preference remains unchanged. Nothing auto-sends.
- [ ] Manually open WhatsApp/tel/SMS/mailto on each target device; test copy-only Messenger/LINE/WeChat/Other. Confirm no message sent without staff action.
- [ ] Progress all request states and reasoned alternates; stale/skipped transitions rejected. Confirm and link once with existing customer/pickup/deadline. Validate quote, deposits, production, one final payment/stock deduction and paid collection. Linked cancellation follows deposit refund rules.
- [ ] Login → Dashboard without cash popup. Admin Open Register records station/amount/user/time/audit. Cashier cannot open/change it through old/new RPCs or direct tables. Shared one-register/day close/reopen restrictions persist.
- [ ] Backup contains requests/events/contact settings and station; restored staging data reconciles. Complete actual multi-connection, printer, scanner, iOS/Android and hosted cloud checks.

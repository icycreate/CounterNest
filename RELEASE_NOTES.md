# CounterNest POS v2.0.0-RC1 — update
Build 2026-10-15-update1 · 15 October 2026. User-facing branding remains CounterNest POS; version/build identification is internal.

Catalogue QR controls now live in Catalogue → Display Settings: View QR, PNG download, printable QR, Copy Catalogue Link, Open Customer Display and Preview Catalogue. Shared URL generation uses saved public origin, then VITE_PUBLIC_APP_URL, then current origin. QR regenerates on base/token change; catalogue/price-list PDFs and optional receipt QR use the same destination. No install/staff login is required.

Customer catalogue product detail supports Add to Pre-Order, variant/quantity selection, more items, name, one enabled contact method, notes, review and submission with same-intent retry recovery. Intake has no mandatory pickup date, payment, reservation or stock mutation. Kiosk/TV remain display-only; normal phone catalogue/display links can submit requests. The legacy counter-selection flow remains available with intent=counter.

Settings adds all eight supported contact-method choices. Staff see only the selected action. Other methods require a one-action admin override with reason/alternate details and an audit record. WhatsApp, phone, SMS and email use safe links; Messenger/LINE/WeChat/Other provide an editable/copyable message. No messaging integration or automatic sending is installed.

The new staff request inbox covers New Request through review/contact/confirmation and optional Awaiting Deposit. Admin links an agreed request once to a scheduled order, which drives Scheduled, In Production, Ready and paid Collected. Cancelled, Declined and No Response preserve reason/history before linkage; linked-order cancellation follows the existing deposit/payment rules.

Login no longer asks for opening cash and goes to Dashboard after explicit sign-in. Admin opens Daily Cash → Open Register with station, amount and note. Cashiers cannot use the retired declaration RPC. Old history is preserved. One shared register per shop/day remains the accounting model.

Unnumbered supply tabs complete the UI numbering cleanup. The seven grouped navigation sections, existing feature tabs, role/page restrictions and browser architecture remain.

Migration 79 is append-only; all 78 baseline SQL files remain unchanged. Local build/regressions and sample-data browser checks passed. Read BUILD_VALIDATION.json and KNOWN_ISSUES.md for scope; real cloud/device/printer/contact-app acceptance remains open.

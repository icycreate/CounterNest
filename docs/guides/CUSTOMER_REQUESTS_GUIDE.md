# Catalogue QR, requests and register opening
## Configure and share
Admin: Settings → Customer Contact Methods. Enable only methods the shop can actually use, then Save Contact & URL Settings. Defaults are WhatsApp, Phone and Email; you may choose any of the eight supported methods. At least one is required while requests are enabled.

Catalogue → Display Settings controls enabled sharing and QR access. Set the final HTTPS origin (no path/query) or leave blank to use the configured Vercel public origin/current site. Save before downloading or printing. View QR, save the PNG for signage/flyers, or open Print QR and print the standalone page. Copy Catalogue Link and Open Customer Display use the same protected destination. Preview Catalogue disables submission.

The public QR includes the enabled display token. A bare /catalogue-display without a token is not a shop directory. Rotating the token disables old links/QRs: reprint existing signs and PDFs. Changing the base URL also requires reprinting old physical copies. Test scan access on a logged-out phone. Never use localhost signage for real customers.

Customer catalogue / price-list PDFs reuse the same QR. To include it on receipts, enable Include catalogue QR on receipts and save; allow the image to load before printing.

## Customer request
Scan QR → open product → choose variant and quantity → Add to Pre-Order. Add more products, adjust/remove quantities, then Customer information. Enter name, the one preferred enabled method and its contact details (phone with country code, email or account ID), plus optional notes. Review and submit.

Pickup is not required at intake. The estimate is subject to current availability, timing, tax, agreed quote and any deposit. A received request is not a paid or confirmed booking. It does not reserve stock. If response is uncertain, Retry Same Request; keep the same tab. A pending submission is held only in that tab's session storage and removed on success. If storage/tab is lost, contact the shop rather than repeatedly resubmitting.

Kiosk and TV links keep a display-only presentation. Normal /catalogue-display or /catalogue links allow requests when enabled. Idle return can be switched off in the display header. The older immediate counter selection is available separately with intent=counter; it is not a pre-order.

## Staff review and contact
Sales & Customers → Pre-Orders / Custom Cakes → Catalogue Requests. Mark Under Review, prepare contact using the preferred method, actually contact the customer, then mark Customer Contacted and Awaiting Confirmation. No message is sent by merely opening preparation. Edit/copy the message or open WhatsApp/email/phone/SMS yourself. Other services use manual copy to the correct application.

Ordinary staff have only Contact via the selected method. Admin Contact Override requires another method, alternate destination and a reason. It creates an audit record and authorizes that action only; the customer preference remains unchanged. Review Request History or Operations → Audit Log → Catalogue requests / contact overrides. CounterNest cannot control a staff member contacting someone outside the app.

After agreeing availability, pricing and timing, mark Confirmed (and Awaiting Deposit if appropriate). Admin selects an existing same-shop Customer record, pickup and production deadline, then Schedule Confirmed Request. Create the customer record in Customers first; requests are not automatically merged by phone/email.

The request links to one scheduled order. Review its current quote before collecting a deposit. Use Scheduled Orders / Custom Cakes for deposits, planning, final POS payment and kitchen progression. The request status follows that order through Scheduled, In Production, Ready and Collected. Collection requires payment. Before linkage, Cancelled/Declined/No Response require a reason; after linkage use normal order cancellation/refund controls.

## Opening daily cash
Sign in → Dashboard. Admin: Operations → Daily Cash → Open Register. Enter register/station, opening cash (zero is valid), and an opening note. Verify Open status, station, opening amount and opened-by/time. Cashiers cannot enter/change opening cash. The former first-login declaration is removed and its write RPC is disabled; historical entries remain in the database.

The register is shared for the shop/day. Station identifies where management opened it; independent simultaneous station balances are not provided. Do not open another day record to work around an existing/closed session. Close-day reconciliation and immutable history remain unchanged.

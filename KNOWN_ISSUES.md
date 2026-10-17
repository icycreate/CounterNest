# Known issues and acceptance limits

- Live Supabase/Vercel publication, real authenticated multi-device UAT and physical scanner/printer/tablet acceptance remain pending. Local PostgreSQL auth/storage are mocked; real bcrypt, cloud Storage HTTP policies and Auth delivery need staging checks.
- Localization coverage is measured in I18N_COVERAGE.json. The measured static catalogue has no English fallback labels; the candidate must be reviewed by native speakers for terminology, long labels and printed Chinese glyphs. Technical provider diagnostics and dynamic exception templates can retain source text so operational details are not lost. User-entered content is intentionally preserved.
- Production board stage changes coordinate work but do not finish a batch or create inventory. Audited stock completion remains in the established management production workflow.
- Inventory staff can receive goods and approved POs; supplier/PO creation/cancellation and private receipt-photo uploads remain administrator actions.
- Held sales are local to the account/shop/browser, expire after 24 hours and are not shared across registers. Customers and rewards must be selected again. A server quote is required at resume and checkout; stock is never reserved by holding.
- Private request tracking links are bearer capabilities. Existing links remain valid for follow-up when new catalogue intake is disabled. There is no automatic WhatsApp/email/SMS delivery; links and templates prepare an editable message only.
- Dashboard/search lists are bounded (search 30, board 100, stock 50, incoming POs 50, notifications 100, staff role list 200, request inbox 300). Older records remain in their full operational modules. Notification/workspace refresh pauses when hidden and normally polls every 30 seconds.
- The inherited profitability report groups by its existing database date behavior. Daily sales counters use the configured business timezone; review profitability near a day boundary before relying on cross-report day comparisons.
- Browser print remains the supported fallback. Direct hardware integration and actual devices require commissioning. Portable exports do not replace managed database/Auth/Storage backups and are not automatic restore tools.

- Unpaid accepted quotes use current configured tax until payment, consistent with the inherited scheduled-order workflow. Paid pre-order reprints use immutable sale totals and zero remaining balance. Review refreshed quotes before collecting payment.
- Supabase Realtime publication is configured conditionally; verify publication/replication settings on the target cloud project. Notification/workspace polling is the fallback.

- The main language-inclusive bundle is approximately 1.01 MB minified / 304 KB gzip. Real slow-device/network first-load performance is pending staging measurement.
- Browser screenshots could not be captured in this environment. Browser interaction evidence is DOM-level; perform pixel-level responsive/contrast and physical print review in staging.

# Remaining issues and acceptance limits
RC1 is a staging release candidate. The following remain open for RC2/UAT:

- The live Supabase applied migration level, Auth/email, real PIN hashing, Storage uploads/policies, Edge gateway/CORS and password flows were not exercised. Local SQL tests use PGlite with Auth/Storage and PIN crypt stubs; Edge tests use mocked services.
- Browser QA used isolated sample data through a QA-only adapter outside the release. It confirms responsive UI behavior, not the frontend-to-live-database integration.
- Vercel rewrite/header configuration and 49 local production-preview routes passed locally. No external Vercel deployment was performed.
- Original RC1 included simulated desktop/tablet/phone layout checks. This update inspected the default browser layout and new actions; resize overrides were unreliable, so the new request forms still require physical Android/iOS/iPad/TV acceptance.
- Printer, cash drawer, scanner, QR payment provider, real money settlement, production network loss and multi-connection database contention need live testing. Sequential role-switch tests and idempotent replays do not prove simultaneous load behavior.
- PDF HTML composition, six scopes and print-layout options passed automated checks. Actual A4/Letter browser printing and exported PDF pagination/images/QR need UAT on target browsers/printers.
- Browser recovery persists an uncertain POS intent per shop/account in the same tab. If storage is blocked, recovery is in memory only. Closing the tab or clearing browser data can lose the recovery reference; check Sales and the payment record before charging again.
- Portable exports omit Auth users/passwords, Storage binaries, platform configuration and PITR history. No automatic full restore is supplied. Pause mutations during export and perform separate tested database/Storage backups.
- Same-shop employee database access to legacy operational tables includes some cost data; menu visibility does not enforce column-level secrecy. A tighter data-minimization redesign requires separate compatibility testing.
- New grouped navigation/section labels are English; complete Spanish localization remains to be accepted.
- Dependency security audit and load/performance benchmarking were not performed. Locked dependency installation/build passed; visual lazy-image and timer behavior were checked without a measured mobile performance budget.

No unresolved failure was observed in the executed local regression suite. Remaining checks must be recorded with environment, operator, evidence and outcome before stable release.

## RC1 update-specific acceptance limits
- Request/contact/register SQL and UI tests passed locally. The browser workflow used a disposable sample adapter outside release source; it was not a live end-to-end Supabase browser transaction.
- Responsive browser resize controls did not reliably retain requested dimensions in this run. New phone/tablet form visual acceptance is still required on actual devices. Default browser layout and UI actions were inspected.
- No messaging provider was configured. App links/copy preparation are implemented; actual WhatsApp/email/SMS/phone app launching and delivery were not exercised. Messenger/LINE/WeChat/Other intentionally use manual copy.
- Basic public intake caps (three per contact/ten minutes, 500 per display/day) are implemented. They are not a complete bot/abuse mitigation system; monitor public intake before broad promotion.
- Pending request recovery uses tab session storage and clears on success. If storage/tab is lost or sharing is disabled/rotated before recovery, contact staff to check the inbox rather than resubmit blindly.
- The existing shared register accounting model remains one shop/day record. Station metadata does not provide independent per-station cash balances.
- Receipt QR loads asynchronously and must be visible before printing. Real thermal printing, saved PDF pagination and QR scanning at printed sizes still require device UAT.
- Contact/timing configuration and legacy records remain compatible at the data level, but the retired cash-declaration RPC is revoked. Old clients enforcing that login gate must be upgraded together.

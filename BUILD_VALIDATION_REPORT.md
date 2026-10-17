# Build validation

CounterNest POS 2.0.0-rc.3 — 2026-10-16-consolidated1.

Local install, build and full verification passed. The 81-file SQL chain applies to the local PostgreSQL engine and all 78 database groups pass. Automated component coverage includes all 16 role/language combinations. All 50 production preview routes return the SPA shell and referenced built assets have correct content types. Four unchanged authentication Edge handlers pass mocked authorization tests.

Cropping, portrait catalogue PDF HTML, direct acceptance/decline, receipt privacy/paid totals, optional deposits, contact restrictions, stock/FEFO, checkout retries and default/dynamic branding are covered by the included tests. The measured translation catalogue has 2854 system labels plus 491 known errors, with zero missing measured static labels. User-entered content is preserved.

Browser DOM checks verified acceptance/receipt, crop preview/save, role homes and four public catalogue languages using disposable fictional API fixtures outside the release source. Screenshot capture was unavailable; no pixel-level screenshots are claimed. See BROWSER_QA_RESULTS.json.

The initial minified chunk is about 1.01 MB (304 KB gzip), including language data; measure real low-end device/network loading in staging. Live Supabase/Vercel, cloud Realtime/Auth/Storage, physical hardware, printed Chinese glyphs and native-speaker acceptance remain pending. See BUILD_VALIDATION.json, KNOWN_ISSUES.md and UAT_ACCEPTANCE_CHECKLIST.md.

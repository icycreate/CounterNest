# RC9 acceptance checklist

Local evidence: BUILD_VALIDATION.json, DATABASE_TEST_RESULTS.json, CALENDAR_TEST_RESULTS.json, BROWSER_QA_RESULTS.json and docs/validation. Passes below apply to local test scope, not deployed acceptance.

## Passed locally

- [x] All 90 migrations apply; 89 RC8 files unchanged; no duplicate event table.
- [x] Accepted pickup, batch, cake and ingredient/legacy delivery projections; date-only and unscheduled rules.
- [x] Four views, Today, shared search/type filters and original-record detail.
- [x] Date/staff/status/search/range pagination and business-zone/overnight boundaries (automated).
- [x] Original production reschedule and audit, stale-update rejection, invalid interval/staff guards; stock/source counts unchanged (PostgreSQL).
- [x] Actual native time-form save 08:00 → 14:00 / 16:00 and selected source workspace link (browser fixture).
- [x] Source order/delivery edits and original-module audit trigger coverage (PostgreSQL).
- [x] Permissions, own-shop isolation, unauthorized/anonymous/temp/frozen/deletion-pending rejection (PostgreSQL).
- [x] Source-linked stable notification identities, deduplication and completed-production exclusion (PostgreSQL).
- [x] Model conflict/shortage/deadline logic; actionable source detail (component/browser).
- [x] English, Spanish, Traditional and Simplified Chinese controls preserve entered titles (React).
- [x] Light/dark/accent contrast, phone Agenda/Day/detail and modal-first Back; unsaved-change guard (browser).
- [x] npm install / build / test / test:assets, ZIP exclusions and checksum.

## Required on the deployed staging project

- [ ] Apply migration 90 with a verified backup; inspect RPC grants, live RLS and query plans for realistic source volumes.
- [ ] Use real accounts in two businesses; independently verify every role and operational permission.
- [ ] Create/accept each original source type and confirm one Calendar event per record; cancel/complete and refresh.
- [ ] Exercise each quick-create form and purchasing approval flow in its original module.
- [ ] Reschedule batch/order/cake/delivery and verify stored original values and commercial-event audit actor/time/reason.
- [ ] Two concurrent editors: first succeeds; stale second cannot overwrite. Check valid/invalid DST transitions where applicable.
- [ ] Load more than 200 results; inspect all pages and warnings. Test rejected/expired requests and reconnect.
- [ ] Trigger each notification and mark read; refresh without duplicates, then change schedule and confirm new identity.
- [ ] Check all four languages, active System theme, light/dark, accents, zoom, keyboard focus and screen reader labels.
- [ ] Install Android and iOS PWAs; test phone/tablet orientations, touch swipe, OS Back/modal/unsaved guards, safe areas, offline/reconnect and service-worker upgrade.
- [ ] Verify shared Catalogue themes, sign-in/out, password recovery email links and baseline checkout/stock regressions in staging.

Record tester, device/browser/version, business timezone, build, evidence and result for each staging item. Do not mark physical PWA accepted from desktop emulation.

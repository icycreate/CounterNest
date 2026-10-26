# CounterNest RC25 — Independent Catalogue Editors

Locally implemented and validated; **not deployed**. Start with [change/test report](RC25_CHANGE_REPORT.md), [manual deployment](MANUAL_DEPLOYMENT_RC25.md), [business user guide](CATALOGUE_EDITORS_USER_GUIDE.md), and [modified files](MODIFIED_FILES_RC25.md). Earlier release reports below are historical.

---

# RC21 — Tooltip and hover contrast correction

**Untested, not type-checked, not build-validated and undeployed.** Read [corrections and manual update instructions](TOOLTIP_HOVER_CONTRAST_FIX.md) and [modified files](MODIFIED_FILES_RC21.md). No new migrations, dependencies or environment variables. Historical validation reports do not apply to RC21.

---

# RC20 — Automatic language detection

**Untested, not build-validated and undeployed.** See [language update and installation notes](AUTOMATIC_LANGUAGE_DETECTION_UPDATE.md) and [modified files](MODIFIED_FILES_RC20.md). No new migrations or environment variables. Earlier validation reports are historical only.

---

# Current release: RC19 — 2026-10-23

**Not tested, build-validated, configured against live services or deployed.** No external service was accessed. Earlier validation reports in this source are historical and do not apply to this update.

Read [change report](COUNTERNEST_NEXT_UPDATE_CHANGE_REPORT.md), [manual migration/WhatsApp/deployment guide](MANUAL_DEPLOYMENT_RC19.md), and [file inventory](MODIFIED_FILES_RC19.md). RC18 upgrades require only migration 97. WhatsApp requires separate Meta setup, approved templates, private server credentials, webhook/scheduler and explicit recipient consent.

---

# Current release: RC18 customer pickup notifications

**Offline source update only — not tested, built, type-checked, UAT-checked or deployed.** No live services were accessed. Historical validation reports below/in this package do not validate this update.

Start with [Customer pickup update](CUSTOMER_PICKUP_NOTIFICATIONS_UPDATE.md) and [manual migration/deployment instructions](MANUAL_DEPLOYMENT_RC18.md). RC17 upgrades require migration 96, `202610201800_customer_pickup_notifications.sql`. Customer push also requires server configuration and explicit device permission. See [changed files](MODIFIED_FILES_RC18.md).

---

# CounterNest POS — RC17 Catalogue order workflow

Complete source based on RC16. Catalogue pre-orders retain submitted snapshots, persistent unread notifications and authorized Contact/Accept/Decline actions. Includes foreground sound preferences, registered-device management and server-triggered Web Push integration.

**Not tested or build-validated, as requested.** Development was offline; no live systems were contacted or changed. Nothing was deployed or pushed.

Read ORDER_WORKFLOW_CHANGE_REPORT.md for changes, MANUAL_DEPLOYMENT_RC17.md for the database/source update, and NOTIFICATION_SETUP.md for Web Push requirements. Apply the new migration after the RC16 baseline before using the updated notification/decision UI. Background delivery requires server keys, webhook/retry schedule, HTTPS deployment and per-device permission/registration.

Existing reports and screenshots from earlier releases are historical only and do not validate RC17. Private environment files, dependencies and build output are not included.

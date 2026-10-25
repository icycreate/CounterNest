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

# RC17 upgrade

Not tested or build-validated. Follow MANUAL_DEPLOYMENT_RC17.md and NOTIFICATION_SETUP.md. RC16 upgrades require one new migration: 202610201200_persistent_preorder_notifications.sql. No migration, deployment, dependency installation or test command was executed during this work.

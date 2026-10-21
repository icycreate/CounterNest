# Current release: RC18 customer pickup notifications

**Offline source update only — not tested, built, type-checked, UAT-checked or deployed.** No live services were accessed. Historical validation reports below/in this package do not validate this update.

Start with [Customer pickup update](CUSTOMER_PICKUP_NOTIFICATIONS_UPDATE.md) and [manual migration/deployment instructions](MANUAL_DEPLOYMENT_RC18.md). RC17 upgrades require migration 96, `202610201800_customer_pickup_notifications.sql`. Customer push also requires server configuration and explicit device permission. See [changed files](MODIFIED_FILES_RC18.md).

---

# CounterNest POS — RC17 Catalogue order workflow

Complete source based on RC16. Catalogue pre-orders retain submitted snapshots, persistent unread notifications and authorized Contact/Accept/Decline actions. Includes foreground sound preferences, registered-device management and server-triggered Web Push integration.

**Not tested or build-validated, as requested.** Development was offline; no live systems were contacted or changed. Nothing was deployed or pushed.

Read ORDER_WORKFLOW_CHANGE_REPORT.md for changes, MANUAL_DEPLOYMENT_RC17.md for the database/source update, and NOTIFICATION_SETUP.md for Web Push requirements. Apply the new migration after the RC16 baseline before using the updated notification/decision UI. Background delivery requires server keys, webhook/retry schedule, HTTPS deployment and per-device permission/registration.

Existing reports and screenshots from earlier releases are historical only and do not validate RC17. Private environment files, dependencies and build output are not included.

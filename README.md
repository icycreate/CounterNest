# CounterNest POS — RC17 Catalogue order workflow

Complete source based on RC16. Catalogue pre-orders retain submitted snapshots, persistent unread notifications and authorized Contact/Accept/Decline actions. Includes foreground sound preferences, registered-device management and server-triggered Web Push integration.

**Not tested or build-validated, as requested.** Development was offline; no live systems were contacted or changed. Nothing was deployed or pushed.

Read ORDER_WORKFLOW_CHANGE_REPORT.md for changes, MANUAL_DEPLOYMENT_RC17.md for the database/source update, and NOTIFICATION_SETUP.md for Web Push requirements. Apply the new migration after the RC16 baseline before using the updated notification/decision UI. Background delivery requires server keys, webhook/retry schedule, HTTPS deployment and per-device permission/registration.

Existing reports and screenshots from earlier releases are historical only and do not validate RC17. Private environment files, dependencies and build output are not included.

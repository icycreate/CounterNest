# Phase 36.5 — Customer Ready Display

Use /?ready_display=TOKEN (or /ready-display?token=TOKEN) on a TV/tablet browser. The board shows Preparing and Ready order numbers, including P-prefixed scheduled pickup orders.

The server returns only shop name, order number, status and ready timestamp; names, contact information, order notes, deposits and item details are excluded. The display refreshes every three seconds and flashes when new numbers become ready.

Enable ready sound requires an explicit browser gesture to initialize audio. Fullscreen also requires a gesture. Browser autoplay, TV sleep/power settings, speakers and LAN latency must be checked on the real device. Completed orders disappear on refresh.

This phase is part of v1.54.0. Upgrade from v1.44.0 with migrations 68–77; read PHASE36.0_TO_36.9_UPGRADE.md and the UAT checklist.

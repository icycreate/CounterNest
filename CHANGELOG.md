# 2.0.0-rc.18 — 2026-10-20

- Added private guest Track Order timeline, pickup banner, business details and clearly labeled totals.
- Added explicit customer notification consent, remembered Not Now and per-order device preferences in four languages.
- Added capability-scoped subscriptions and transactional accepted/preparing/ready outbox with retry leases and deduplication.
- Extended existing Web Push dispatcher/service worker with private local tracking bindings and exact-order notification navigation.
- Added optimistic status transitions to existing staff Ready actions; retained audit, payment and stock protections.
- Preserved shared browser subscriptions when removing an individual customer or staff registration.
- Added manual migration/configuration/deployment instructions; no dependency changes or live-system changes.
- Not tested, built, type-checked, UAT-checked or deployed at the user's request.

---

# RC17 — Catalogue pre-order notification workflow (2026-10-20)

- Preserve immutable submitted order/contact/price snapshots and capture international phone for every contact method in the current customer form.
- Persist per-user unread acknowledgements and deduplicate foreground popup presentations.
- Add detailed incoming-order Contact, Accept, Decline and View later actions, with request revision checks and queued alerts during payment/dialogs.
- Add Manager order-handling access, exact-record retrieval, selectable foreground sounds/repetitions and registered-device management.
- Reuse server-triggered push outbox; add durable worker retry suppression and retain badges until acknowledgement.
- Add four-language labels, responsive theme styling and manual migration/deployment/Web Push instructions.
- No live systems accessed; not tested or build-validated.

# RC16 — New Sale workspace (2026-10-20)

Removed embedded Catalogue Selection; added direct-to-cart products, compact required options, sticky desktop/tablet cart, mobile cart summary and translated controls. Existing checkout and data workflows retained. No migrations. Not tested or build-validated.

# Changelog

## 2.0.0-rc.15

- Implemented customer and admin presentation redesign from the supplied reference.
- Added responsive customer navigation, favorites, feature panels and four-language About/contact/account surfaces.
- Preserved full-image galleries, cart/pre-order contracts, PWA and enabled business contacts.
- Added a sales visualization using existing loaded net values; retained all role-specific dashboard information.
- Fixed new-cart confirmation state, public notes exposure, the standalone catalogue route, missing navigation translations and React 18 image-property warning.
- Retained 94 migrations and all Supabase/API files unchanged.

Detailed removal/change inventory: REDESIGN_CHANGE_REPORT.md. RC14 is the retained baseline.

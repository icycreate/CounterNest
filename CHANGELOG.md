# RC24 — 2026-10-25

Added staff-confirmed Customer Recognition & Order Linking, international-phone candidates, duplicate-checked optional customer creation, guest acceptance, linked request history and audited concurrent-safe association changes. Reuses existing scheduled-sale and loyalty completion. Public submission/tracking and RC23 About page preserved. Untested, not built, undeployed. See CUSTOMER_RECOGNITION_ORDER_LINKING_UPDATE.md.

# RC23 — 2026-10-24

Corrected the existing About CounterNest page to display administrator-saved text and the dedicated About photograph. Removed RC22 home-storefront About insertion. Preserved navigation and product browsing. Added optional localized highlighted statement and backward-compatible validator migration. Untested, not built, undeployed. See RC23_ABOUT_INTEGRATION_REPORT.md.

# RC22 — 2026-10-24

Editable, localized business About Us with private image storage, crop preview, responsive Catalogue rendering, guarded drafts and conflict-safe publishing. Based on RC21 syntax fixes. Untested and undeployed. See RC22_CHANGE_REPORT.md and MANUAL_DEPLOYMENT_RC22.md.

# 2.0.0-rc.21 — 2026-10-24

- Add shared neutral Light/Dark tooltip tokens following resolved System appearance.
- Render existing hover labels in a reusable viewport-positioned portal with keyboard support.
- Replace nested contact tooltips while preserving visible touch labels and contact actions.
- Pair popup/menu hover, selected and disabled foreground/background colors using existing theme tokens.
- Remove legacy button brightness/fading rules; preserve business colors and workflows.
- No database or backend changes. Untested, not build-validated and undeployed.

---

# 2.0.0-rc.20 — 2026-10-23

- Detect supported browser language preferences before login/public rendering, with English fallback.
- Match regional Spanish and Chinese script/region identifiers through BCP 47 parsing.
- Preserve explicit staff preferences and isolate customer/PWA manual choices from POS settings.
- Save only deliberate staff language changes; never persist automatic detection as a manual choice.
- Synchronize existing customer notification subscriptions to the selected language without permission prompts.
- No new migration, permissions or business-data changes. Untested and undeployed.

---

# 2.0.0-rc.19 — 2026-10-23

- Default enabled WhatsApp for Catalogue contact; preserve empty customer number and review drafts.
- Reuse locally available libphonenumber metadata for shared country-aware parsing, formatting and validation.
- Center enabled business contact icons with accessible persistent labels/tooltips and safe destinations.
- Refine request dialogs and correct Light appearance with dark custom business colors.
- Add archived-customer filters, same-record administrator restoration and authorized loyalty history.
- Add optional consent-based WhatsApp Cloud API template alerts via existing committed order events.
- Preserve direct-to-cart New Sale, cart layouts, staff Web Push and customer pickup notifications.
- Add migration 97 and offline deployment/configuration documentation; no business data changes executed.
- Not tested, built, configured against live services or deployed.

---

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

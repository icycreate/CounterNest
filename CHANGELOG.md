# Changelog

## 2.0.0-rc.13 — 2026-10-18

RC13 centralizes measured foreground/background pairs and enforces the shared Button paint contract. Remove, Delete, Archive, Decline, Clear, Reset and Void actions keep a strong red identity; disabled and loading labels remain opaque and readable. Cards, prices, fields, table rows, statuses, report panels, receipt toolbars and customer preorder steps use theme-safe colors. Staff Catalogue now initializes authentication and theme normally; token-bearing customer links remain public.

- Added accessiblePalette.ts, accessibility.css and automated contrast/route regression checks.
- Migrated 24 explicit destructive actions to danger; inventoried 733 shared Button usages across 68 source components.
- Removed raw accent text and legacy important foreground overrides.
- Fixed dark receipt toolbar, preorder steps, report metrics, hardware/readiness cards and staff Catalogue hydration.
- Preserved all 94 SQL migrations and approved branding assets.

# Changelog

## 2.0.0-rc.12 — 2026-10-18

- Add workspace measurement registry, custom-unit RPCs, ingredient unit profiles and audit.
- Normalize source units into base inventory quantities while retaining entered order, receipt and recipe history.
- Keep approval and verified receiving/idempotency paths; freeze PO factors and hide source prices from operational projections.
- Normalize legacy/master/variant media into one gallery, synchronize primary image fields, and use the canonical gallery in customer detail.
- Add validated public decorative branding storage, administrator appearance controls and token-scoped customer projection.
- Add semantic danger/disabled tokens, broad accent contrast checks and contained full logo/icon separation.
- Preserve RC11 contacts, notification flows, four languages, category rules, dirty navigation handling and browser-only deployment.


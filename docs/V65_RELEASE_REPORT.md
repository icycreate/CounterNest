# CounterNest v6.5 review candidate — build 60500

Status: implemented locally and prepared for draft review, not a completed production release. Phone testing is explicitly deferred by the owner.

## Changes and release notes
- Customer pre-orders no longer ask for requested pickup time or show its timezone helper/review row. Staff contact the customer using the selected method to arrange pickup. Existing snapshots, pending retries and historical pickup information are preserved; no column or historical record was changed.
- Shared image cropping retains alpha for PNG/WebP instead of painting white and exporting JPEG. An explicit Use original image action keeps the original bytes. Crop uploads use the actual MIME type and extension across products, gallery, content editors, About Us and ingredient thumbnails. About Us now stores a separate source image and registers its relationship through existing media metadata. No existing image is rewritten; white pixels in opaque files remain white.
- Android icons now use the official web icon asset, not a business logo or the full wordmark. Adaptive layers use 108dp canvases with 64dp artwork; round legacy icons are circular, launcher backgrounds are cream, and splash artwork has light/dark variants. Package remains com.counternest.pos; version is 6.5.0 / 60500.
- Settings now has one Notifications & Alerts entry with Desktop, Mobile, Email and WhatsApp selections. Existing channel components, independent saves, permission prompts, recipient scope and notification history are retained. Summary updates after saved business preferences. WhatsApp is unavailable without a real integration. Email remains restricted by the existing server policy to Mrs. Su kitchen's configured administrator. No multi-business rollout, pg_net dispatch or Vercel relay was added.
- Four-language system labels, two-column phone channel selector, wrapping buttons and 44px targets. Settings title stops sticking over mobile content. Service-worker cache version advanced for the web update.

## Security and data
Read-only production inspection confirmed business-scoped, role-checked notification RPCs; anonymous EXECUTE is denied. Android save is admin-only, scoped to current_shop_id, and revision checked. Email get/save remains bound to the authorized Mrs. Su workspace. Device lists expose labels and registration state, not FCM tokens. No credential values were inspected, changed, committed or included in the APK. Business-wide Android alerts remain disabled. Existing Edge Functions were not changed or deployed.

## Mobile-First QA
Primary viewport: 390 x 844. Automated overflow matrix: 320x568, 360x800, 375x812, 384x824, 390x844, 412x915, 768x1024, 1024x1366, 1280x800, 1440x900, 1920x1080; English, Spanish, Traditional Chinese, Simplified Chinese; light and dark.
- Unified notification panels: 88 viewport/language/theme combinations, four channels each; no document horizontal overflow. Explicit device-enable interaction verified with native APIs mocked. 32 full-page 390px channel screenshots captured.
- Incoming-order/dashboard regression: 88 combinations; popup bounds and 44px actions fit; View later retains unread status.
- Actual browser pre-order review and submission without pickup passed against a local server fixture; selected WhatsApp method retained.
- Canvas pixel tests passed: transparent PNG corner alpha remained zero after crop; opaque white JPEG pixels stayed opaque and white.
- Selected 390px screenshots inspected for readable layout. This is not complete visual acceptance of every changed state/page.
- Still pending: physical Samsung upgrade, launcher shapes/app drawer/splash/recents, saved sign-in after upgrade, keyboard/safe-area behavior, full initial/scrolled/modal/error/loading/empty state matrix, 200% zoom/text scaling, complete About Us/editor visual matrix, and live channel delivery after upgrade. No new production order was submitted.

## Executed checks
- TypeScript: passed.
- Production web build and Capacitor sync: passed; existing large-chunk, mixed-import and vendored eval warnings remain.
- Android debug APK: built; signature matches the existing v6.4 debug APK.
- Android push database security: 107 migrations applied locally; all 9 groups passed, including tenant separation, role restrictions, duplicate protection, invalid token handling, expiry and logout.
- Android worker checks: passed, Firebase mocked.
- Email handler: all 8 groups passed, provider mocked.
- Database regression suite: passed (local PostgreSQL engine), covering checkout, inventory, payments, pre-orders, auth/workspace roles, notifications and history.
- Frontend filters, UI components, navigation/theme: passed.
- Catalogue editor/security suite: 23 groups passed, including preservation of historical pickup snapshots and source-image references.
- Boot, branding and customer-request regression: passed after updating stale test fixtures (old cache tag, invalid fictional phone, old direct-anonymous submission path). Production permissions were not weakened to satisfy tests.
- No separate JavaScript lint command is configured. Android app lint passed with 32 warnings after correcting the ignored local SDK path format. Warnings are retained in the release output.

## Pending configuration and limits
With explicit owner approval on November 3, 2026, the production catalogue-about bucket limit was increased from 2 MiB to 12 MiB (12582912 bytes), then verified by a separate read. MIME restrictions remain JPEG/PNG/WebP. No file, table, RLS policy or managed extension was changed. docs/V65_PROPOSED_STORAGE_CHANGE.sql records the approved idempotent configuration SQL; no schema migration was required.
Existing SVG assets retain transparency. New arbitrary SVG uploads remain rejected by the existing storage MIME allowlist; a reviewed sanitization/upload policy is still required to expand that support. This requirement is not claimed complete.
Overview intentionally reports delivery verification required when a business preference is enabled but server/provider health is not exposed by existing RPCs. It does not invent sender verification, inbox delivery or successful OS push. Android preferences list only the current authorized user's devices; other staff devices remain private.
Phone UAT and the remaining visual matrix are release gates. This candidate must not be represented as fully accepted or production-ready.

## Rollout and rollback
1. Review the draft PR and candidate APK. Resolve SVG scope; complete the remaining visual and real-phone checks.
2. The approved storage correction is applied and verified. No Edge Function deployment or notification-secret changes are needed for this candidate.
3. Review the existing Vercel preview before promoting the web release; do not merge/promote while release gates remain.
4. Install the debug APK as an upgrade with the existing debug signature for controlled testing; do not uninstall or clear app data. A separately managed production signing identity is required for a signed release distribution.
5. For web rollback, restore the previous verified deployment. Preserve all uploaded files, order snapshots and notification records. Raising the bucket limit is non-destructive; do not delete originals on rollback.
6. Android rollback must preserve user data: use a forward version with reverted code signed by the same identity. Do not silently uninstall or force a downgrade.

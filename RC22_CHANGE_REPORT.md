# RC22 — Editable business About Us

Date: 2026-10-24
Base: corrected RC21 source (includes both JSX and pickup-migration syntax fixes).
Status: implemented locally; NOT TESTED, NOT BUILD-VALIDATED, NOT DEPLOYED.

## Changes
- Settings > Catalogue Settings > About Us, restricted to administrators in the UI and backend.
- Heading, introduction, story, alternative text, visibility, language selection, preview, Save Changes and Cancel.
- Existing saved business About Us values load without placeholders. With no saved business record, the editor starts blank and hidden. The existing CounterNest product-story page is preserved separately; it is not treated as the business's own story.
- Optional English, Spanish, Traditional Chinese and Simplified Chinese content. Empty translated fields fall back to default content. Business-entered strings are rendered as text, never auto-translated or interpreted as HTML.
- JPEG/PNG/WebP input up to 12 MB; shared cropper supports recommended landscape 16:9, square, portrait and original proportions, zoom and horizontal/vertical repositioning. Preview is local until Save Changes.
- Shared crop optimization exports JPEG up to 1600 pixels on the longest edge and 2 MB, without upscaling. Transparent areas are flattened to white, matching the existing cropper.
- Upload/replace, edit the saved image crop, remove, and restore the saved image before saving. Cancel discards the draft after confirmation. Navigation and browser-close guards protect unsaved changes.
- Responsive public section on Catalogue home and the About page, using existing theme variables and the existing language preference. Hidden/empty business sections render nothing.
- Poll published content every 60 seconds while the Catalogue is visible. Opening/reloading the Catalogue fetches current content. Signed image URLs renew during long sessions.
- Additive configuration columns and scoped RPCs, row-lock/revision conflict protection, private image bucket with immutable uploads. Unrelated settings and business records are not updated.

## Failure and storage behavior
Uploads use new workspace-prefixed object names. Only after upload succeeds does a transactional RPC publish the new configuration. A failed upload or rejected save keeps the previous published configuration. On an ambiguous network failure after server commit, reopen the editor to read the server's saved state before retrying.

Clients cannot delete or overwrite About Us objects. Replaced/removed images and uploads from failed saves remain stored, so a failure cannot erase the prior image. They stop being publicly signable when no enabled published configuration references them. Previously issued signed URLs can remain usable for up to one hour. An administrator can still inspect their own workspace's retained assets. Manual retention cleanup is documented separately.

## Remaining limitations
No tests, typecheck, build, browser validation, external calls or deployment were performed for RC22. Earlier release reports and logs are historical, not evidence for this update. The previously reported database tracking-response assertion discrepancy remains outside this feature's scope. Real Supabase Storage permission behavior, image processing on target devices, responsive appearance and end-to-end publication require later authorized validation.

Migration and storage setup are required before this editor can load/save. The Catalogue needs connectivity to fetch this content and its signed image; it is not newly cached for offline reading. No new notification behavior is introduced.

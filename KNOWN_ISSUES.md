# RC11 known limits and acceptance

- Live Supabase migrations, deployment secrets, database webhook and retry scheduler have not been configured. Background delivery remains inactive until NOTIFICATION_SETUP.md is completed.
- External transport/OS notifications and installed physical devices are not certified by local mocks. Custom three-ring sound is foreground only and needs a user gesture; OS background sound/badges vary. Test Notification is local, not a server round trip.
- Queue delivery is at least once around process crashes; tags/topics and foreground event claims deduplicate identity. Without Web Locks, simultaneous multi-tab claims can race. Completed and exhausted events are retained; configure operational retention if needed.
- Dispatcher supports known push-provider hosts only and processes 50 deliveries per call. Provision webhook/retry frequency and server capacity for your device volume. Subscription rotation/expiry or site-data clearing requires registration again.
- Signed favicon URLs remain unmodified; platform icon caches may retain old installed icons until refresh/reinstall. The approved artwork is a raster identity sheet embedded in SVG viewports, not original vector artwork. Dark fallback retains the artwork's light background.
- Customer theme defaults to Light independently of the administrator mode, but keeps configured business colors. Verify custom near-black backgrounds and every supported accent on real devices.
- Public contacts require explicit administrator entry. WeChat handles or non-link values can display as text/QR; only safe HTTPS links or validated phone/email links are clickable. Gallery saves remain immediate, while product details save separately.
- Product/category entity translation rows are retained for history/rollback; product names ignore them, and custom categories are never guessed. Older system translations outside this release should still receive final manual linguistic UAT.
- Original large-bundle Vite notice and test-only CommonJS import.meta warnings remain nonfatal. No offline checkout queue is added.
- Real Supabase Auth email/password flows, storage uploads/crop CORS, printers, scanners and destructive workspace UAT remain staging/device checks. Production data was not altered during this build.

- Native browser capture was intermittent during this run. Three usable local captures are included, with exact provenance in CUSTOMER_EXPERIENCE_SCREENSHOT_MANIFEST.json; fresh comprehensive desktop/alert/gallery screenshots remain pending. Existing RC10 screenshots are retained as baseline only.

Product category values remain canonical in editor state and saves; localization is a display label only, so editing a product in Spanish/Chinese cannot clear its category relationship.

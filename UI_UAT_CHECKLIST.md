# RC8 UAT checklist

Local automated/browser results are recorded separately; these are staging/device sign-offs.

- [ ] Apply migration 89 to staging with the prior 88 migrations already present. Verify existing receipts, purchasing, production and inventory.
- [ ] Desktop Chrome/Edge, tablet and phone: Sign In, Sign Up, Forgot, emailed Reset, business onboarding and initial password change remain light/readable with password eyes. Verify inactivity notice.
- [ ] Dashboard → Products → Modify → Back → Products → Back → Dashboard. Repeat with changed values: Stay keeps edits, Discard closes without saving.
- [ ] Repeat dirty Back for Ingredients, Suppliers, Purchase Orders, Receiving, Customers, Staff, Settings, Pre-Orders and Recipes. Save then Back must not falsely warn. Verify canceled Settings previews revert.
- [ ] Customer Catalogue → Product Detail → full image: Back closes image, then detail, then returns internally or remains on exact Catalogue Home link.
- [ ] Mobile drawer, command palette and notifications close before page navigation. Escape/Tab/Shift+Tab/focus return work. No root redirect/history loop.
- [ ] Separately test Android system Back and installed Android PWA; separately test Safari browser and installed iPhone/iPad PWA. Browser/OS may override gestures or skip script-created entries.
- [ ] Admin orange/blue/green accent plus light/dark/system publishes to that business's public Catalogue, mobile/PWA, detail, preorder and QR surfaces within five visible seconds. Check reopen and OS theme changes. Another employee's private mode must not publish.
- [ ] Two tenant links on one device never share palette/branding; invalid/disabled/pending-workspace links reveal no private data. Confirm signed favicon URLs and removed-logo fallback.
- [ ] Reduced motion, fast/slow network, cold load, refresh, offline/error recovery; no repeated splash during internal navigation.
- [ ] Verify contrast/focus with the business's custom palette, form labels and keyboard-only use. Test browser-native reload/close warning for a modified form.

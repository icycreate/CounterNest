# CounterNest New Sale update — RC16

This update has not been tested or build-validated, as requested. No external website, service, database, deployment or push was accessed or performed.

## Removed
- The embedded Catalogue Selection card from POS → New Sale, including its presentation-only browsing controls and ordinary-product detail popup.
- Unused New Sale category/search state from the previous implementation.

## Changed
- Ordinary product taps add immediately; repeated taps merge quantities, including ordinary lines resumed from held sales. Variant/option lines merge by their selections.
- Required variants/options use a compact selector. Bundles retain their existing component selector. Barcode and quick-add use the same product selection path.
- Product search, category buttons, two-column mobile product grid, and adaptive desktop/tablet workspace.
- Sticky right cart when at least 760px of workspace width is available, with scrollable contents and accessible totals/payment controls.
- Mobile bottom summary and dedicated cart view; returning preserves cart and browsing state.
- Customer selection in the cart, explicit item removal, touch-sized quantity controls, and shared theme tokens.
- English, Spanish, Traditional Chinese and Simplified Chinese interface labels; product names remain unchanged.

## Preserved
- Existing business records, configuration, database schema and migrations. No data edits or new migrations.
- Existing quote, pricing, discount, tax, payment, checkout recovery, receipt and inventory deduction logic. Adding items changes cart state only.
- Customer loyalty, hold/resume, customer selection inbox, scanning, role permissions and other POS modules.
- Separate Catalogue management, customer Catalogue, Display, Catalogue PWA and Pre-Orders.

## Modified files
- `src/App.tsx`: New Sale selection wiring, cart layout, mobile cart state and accessible controls.
- `src/PosProductBrowser.tsx` (new): product browser, existing read-only catalogue feed, compact options selector and bundle selector integration.
- `src/newSale.css` (new): scoped responsive workspace/cart styling.
- `src/main.tsx`: scoped stylesheet import.
- `src/translations.ts`: translated interface labels.
- `package.json`, `package-lock.json`, `public/sw.js`: RC16 version/cache identifiers; dependencies unchanged.
- `RELEASE_MANIFEST.json`, `README.md`, `RELEASE_NOTES.md`, `FINAL_SOURCE_NOTE.txt`, `CHANGELOG.md`, `NEW_SALE_UPDATE_REPORT.md`, `INSTALL_UPGRADE_GUIDE.md`: release documentation.

Existing reports and screenshots inherited from RC15 and earlier are historical only and do not validate RC16. No new testing reports or checklists were produced.

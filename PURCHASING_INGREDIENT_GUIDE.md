# Ingredient purchasing and verified receiving

Open Ingredient Purchasing from Purchasing, or use Purchase Identification on an ingredient in Recipes & Ingredients. Search and page through up to 40 ingredients at a time. Purchasing information is internal; customer catalogue endpoints do not include it.

## Identify the package

For each ingredient, save its preferred brand, package description, base units per package, supplier SKU, barcode, buying notes, and prominent do-not-buy warning. The preferred supplier and ingredient name/unit continue to come from the ingredient master. Enter package quantities in the ingredient's existing base unit: for example a 1 L carton is 1,000 ml. Supplier comparison only works correctly when equivalent quantities use the same base unit.

Upload JPEG, PNG, or WebP files up to 12 MB. Original, optional secondary, substitute, and thumbnail photos are stored in the private `ingredient-packages` bucket. The original file is uploaded unchanged. Cropping creates a separate thumbnail; Cancel on the crop dialog keeps the original without a crop. Removing or replacing a reference changes the record and retains the prior object for backup/recovery; it does not publish the photo. Five-minute signed URLs allow authorized staff to preview files. Reopen or refresh the page after a URL expires.

Approved substitutes support brand, package size, barcode, supplier, private reference photo, priority, and notes. Do not enter unapproved alternatives as approved substitutes. Package warnings and notes remain exactly as entered when the UI language changes.

## Plan and approve purchases

Projected available stock is on hand plus open incoming PO quantities, less active production reservations and forecast demand. Suggested quantity fills the target level and rounds upward to whole supplier packages. Buy Now indicates projected stock at or below zero; Buy Soon indicates projected stock at/below the reorder level. Overstock Risk indicates more than 150% of a positive target. Reservations do not deduct physical inventory.

Create a purchase need from the card. Select its supplier and quantity. Staff without cost-view permission use the server's ingredient cost estimate. The default approval setting is No approval to preserve existing operating behavior; administrators can choose Always require approval or Approval above amount. Every explicit approval/rejection requires a reason. Direct legacy PO creation is also blocked when the configured approval rule applies. Converting an approved need creates one PO and repeated conversion returns that same PO.

Add approved supplier offers to retain package quantity, package price, normalized cost, minimum order, lead days, reliability percentage, quality score, and availability. Offers are appended rather than overwritten. Comparison shows the latest recorded offer for each supplier and identifies the lowest normalized cost and quickest lead time. Selecting or saving an offer never silently changes an ingredient's supplier. Price history and the cost trend show actual ingredient PO receipts, limited to the most recent 30 per ingredient. Staff without cost permission see operational package information without historical costs.

## Buy and receive

The Mobile Buying List shows approved/ordered needs and reuses the package card. Use a connected USB/Bluetooth keyboard scanner, or manually enter a barcode. A preferred barcode or approved-substitute barcode is accepted. A mismatch requires an administrator with override permission and a reason of at least five characters; buyer status and override events record the user and time. No camera access is required.

Enable Require verified receiving to block unverified legacy ingredient PO and direct ingredient-stock receipt routes. Open Verify & Receive and compare the approved card with the delivered item. Record actual quantity, invoice unit cost, supplier lot, optional expiry, and scanned barcode. Explicitly check ingredient, brand, package size, barcode, and package condition. A failed check or mismatched barcode requires an authorized reasoned override; it is not accepted automatically. Opening a delivery loads its expected package cards in one bounded request, independently of the ingredient search page.

Quantities cannot exceed the outstanding PO quantity. Existing receiving validation rejects expired stock and invalid lot dates, updates weighted ingredient costs, creates lot and inventory ledger records, and keeps partial deliveries open. A stable request key makes an identical retry return the original receipt; changed retry details are rejected. A rejected verification rolls back stock and audit changes together.

## Permissions and audit

Permission presets control ingredient editing, supplier offers, need creation, approval, receiving, override, operational views, and cost visibility. Production can create purchase needs without receiving authority. Inventory can buy and receive without approving its own exceptions by default. Administrators can review the bounded purchasing audit under Purchasing Settings, including old/new identification, approval decisions, package overrides, buyer status, actor, timestamp, and reason.

## Release validation

`tests/ingredient-purchasing-database.cjs` verifies tenant/private-image checks, preferred/substitute/mismatched barcodes, override authorization, immutable normalized offers, approval enforcement, one-time PO conversion, legacy verification bypass blocking, partial receipt/lot accounting, retry idempotency, cost privacy, and failed-check rollback. `tests/ingredient-purchasing-ui.cjs` verifies projected demand/package rounding and the reusable card's package, substitute, and do-not-buy content. Actual storage HTTP upload, connected scanners, signed-image loading, and phone/tablet layout still require target-environment UAT.


## Production and costing

Accepted pre-orders reserve ingredient requirements immediately; linked scheduled batches replace the virtual order reservation instead of adding a second demand. Reservations never deduct physical stock. Cancellation/completion releases reservations; existing FEFO completion consumes the earliest valid lots and transfers output once. Forecast demand is separately entered unreserved demand; do not enter already committed orders again. Buying suggestions fill target stock and round to the approved supplier package quantity. Review expiry/recall alerts and dispose/record unusable stock using the existing waste/lot workflow before relying on physical balance projections.

Recipe costing can use weighted average or the latest approved supplier offer. Packaging, labor, overhead, yield and target-margin settings remain in recipe maintenance. Applying a selling-price recommendation remains an explicit audited administrative action. Operational users without costs permission receive safe projections. Waste summaries show causes, affected items and trends; authorized recalls trace supplier lots through ingredient use, finished batches and sale/order links.

Supplier reliability/quality and forecasts are operator-entered inputs, not automatic supplier selection or statistical predictions. Barcode scanning supports a keyboard-wedge scanner or manual entry; verify the intended package and required checklist before finalizing receipt.

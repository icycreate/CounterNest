# Purchasing model — RC6

Normal sellable products and purchasable inventory are distinct. Products retain their existing POS/Catalogue behavior. products.inventory_source defaults to made_in_house; only an explicitly approved purchased_for_resale product gets a linked resale purchase item. Internal purchasing uses the existing ingredients registry, now classified by item_type: ingredient, packaging, supply or resale. resale_product_id is unique and protected by foreign key and link constraint. No duplicate supplier/identification/PO/receipt ledger was introduced.

| Record | Purchase Orders / Receiving | Stock behavior |
| --- | --- | --- |
| Made-in-house Chocolate Cake | Excluded; product IDs rejected by purchasing RPCs | Existing recipe/production consumes ingredients and creates finished stock; POS decreases sellable stock |
| Flour / Cream | Included as Ingredient | Verified receiving increases ingredient on hand; production consumes it once |
| Cake Box / Board | Included as Packaging | Verified receiving increases on hand; recipe use can consume it |
| Labels / business supplies | Included as Supplies | Verified receiving increases on hand; adjustments/waste remain audited |
| Bottled Drink explicitly marked resale | Included through its linked purchase item | Receiving increases both linked views of one balance; POS decreases both once |

The same purchase card is reused in identification, Purchase Needs, Purchase Orders, Mobile Buying List and Verified Receiving. It includes package/secondary image storage, supplier SKU, brand, size, barcode, approved substitutes, Do Not Buy notes, package price and normalized unit cost. Alternate offers retain supplier-specific SKU, package size, minimum order, lead time and normalized cost. A receipt never silently changes the preferred supplier.

Purchase Needs reference only eligible registry records. Recipe shortages still resolve to underlying ingredients, not finished product purchases. Projection uses on hand + incoming − reservations − forecast and rounds to supplier packs. Existing forecasting and recipe ledger code is retained.

Verified receiving is mandatory for all supplier receipts. Old product-based PO/receipt endpoints are retired and their historical tables remain readable/exportable. Eligibility is checked in both order/need table guards and the receiving RPC. Receiving compares Expected Approved Item with Received Item, validates the package checklist and barcode, records lot/expiry and updates the existing weighted-cost ledger atomically. Overrides require the explicit purchase_override permission and a reason; user/time/old-new audit entries remain tenant scoped.

Resale opt-in creates a registry link and an opening lot for any existing stock without incrementing stock. Quantity changes mirror in both directions only when the balances differ, preventing loops/double deduction. POS stock changes append the purchase-item lot movement. Expired/recalled resale lots cannot satisfy a sellable reduction. Resale items cannot be recipe ingredients or production outputs. Resale variants must use the shared master stock balance; independent-stock resale variants are unsupported by this release.

RLS remains enabled on existing tables; no public table-write grants or anonymous purchasing grants are added. Private helper functions stay revoked from browser roles. Administrator-only inventory-source classification requires a reason; item classification requires ingredient_manage; preferred-supplier changes also require supplier_manage. Ordering, approval, receiving and overrides use existing explicit operation permissions. Workspace restore replays snapshots through the protected service-only lifecycle without re-running stock/classification effects.

SearchField is shared by existing searches and reusable RecordTable, so products, inventory, reports, staff, audit, expenses, recipes and production tables have the same search treatment. Catalogue, pre-orders, customer, supplier, purchasing, receiving and global search use the component as well. Table searches filter loaded records; purchasing name search is server-backed and paginated. Business-entered names and content are never translated.

Browser branding uses uploaded business logos and the title Business Name • CounterNest. Empty/removed/failed logos use the bundled CounterNest SVG; empty business name uses CounterNest POS. Non-signed favicon URLs get a version query; signed logo URLs are preserved intact. Installed-PWA manifest/icons remain governed by the existing PWA workflow.

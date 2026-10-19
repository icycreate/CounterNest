> RC13 current release: 2.0.0-rc.13, build 2026-10-18-accessibility. Upgrading RC12 requires no additional SQL; all 94 migrations are unchanged. Use INSTALL_UPGRADE_GUIDE.md, ACCESSIBILITY_AUDIT.md and BUILD_VALIDATION.json for current scope. Earlier release-specific passages below are historical context.

# CounterNest shared UI system — RC10

## Reference and scope

The supplied Settings image defines the visual reference, not new business functionality: a serif page title/date, primary save action, rounded light cards, icon circles, two-column fields, readable labels, soft borders/shadows and comfortable space. CounterNest's existing functions are retained; unsupported notification-email settings from the illustrative image were not invented. Settings begins with Business Information and Store Preferences, followed by existing receipt, contact, hardware, session/security, app, language and appearance controls. Personal workspace preferences remain available farther down the page.

Layout and component geometry are centralized in src/systemStyle.css. Colors remain owned by sharedTheme.ts and sharedTheme.css: primary/foreground, page, surface, card, border, text, muted, input, focus, success, warning and danger. The new spacing scale is 4/8/12/16/24/32px; inputs use 11px radii, cards 18px and dialogs 22px. Labels remain readable, entered values use regular weight, controls have native validation/autocomplete semantics, and actions meet a 44px target where appropriate. The existing icon library remains; no UI framework or runtime dependency was added.

## Shared components in actual pages

- PageHeader.tsx accepts title, subtitle/date, status, actions and timezone. Existing custom header children are supported so the original action handlers remain with their modules. Dashboard, Settings, Products, Catalogue administration, Customers/Loyalty/Cards, Pre-Orders, Calendar, production, recipes/ingredients, purchasing/receiving, suppliers, reports, expenses, cash, staff, audit, readiness and workspace recovery use shared headers or their parent workspace header.
- Surface.tsx supplies Card and SectionHeader. Existing panel classes are retained to preserve module selectors; rendered cards share the same visual tokens. Settings uses icon section headers and full-width cards with responsive field grids.
- Fields.tsx supplies FormField, InputField, SelectField, TextAreaField, BarcodeField and Toggle. Native control refs, names, required/disabled state and handlers pass through. Dropdown arrows are drawn once using inherited color. The split PhoneInput keeps searchable country names/flags/dial codes and canonical storage; its country search is compact and its number field matches the shared height.
- Existing SearchField remains the single list/global search field with its icon, accent border and keyboard behavior. All migrated fields and prices use shared theme surfaces in customer-facing Catalogue flows too.
- Button.tsx supplies primary/secondary/success/danger/ghost, forwarded refs and a loading state with disabled repeat submission. Existing native-button semantics and handlers are preserved during migration. Specialised cards, sidebar items and mobile navigation keep their layout through centralized component variants/bridges.
- SegmentedNav.tsx is shared by related section/category groups, including customers, pre-orders, production, recipes and Calendar views. Groups retain balanced left inset, equal height, wrapping, active semantics and ordinary keyboard focus rather than pretending to implement an arrow-key ARIA tablist.
- StickyActions.tsx keeps action rows within scrollable editors. Product Save, Purchase Order/Purchase Need and verified Receiving retain their original submit/approval rules. Confirmation dialogs, empty record lists and gallery previews use shared surfaces and controls.

SYSTEM_STYLE_COMPONENT_COVERAGE.json, SYSTEM_STYLE_FIELD_COVERAGE.json, SYSTEM_STYLE_ACTION_COVERAGE.json and the final SYSTEM_STYLE_MIGRATION_COVERAGE.json document the actual source migration, not just a mockup.

## Sticky behavior and navigation

PageHeader observes its page dimensions without queries. It becomes sticky only on a sufficiently long page and when the header is less than 40% of the viewport height. Its offset accounts for an actually fixed/sticky mobile topbar. On very short screens, a large header stays in normal flow to avoid consuming the editing area. Desktop primary actions align right; phone actions wrap left. Headers remain below modal/navigation layers, and printing removes them.

Editor actions use position: sticky at the bottom of their owning dialog, never a permanently fixed viewport overlay. Purchase editor overlays now share proper fixed-backdrop geometry and bounded scrolling. Shared Back behavior still closes the top modal, then the previous CounterNest route, then the bounded dashboard fallback. Dirty forms retain Stay Here / Discard & Go Back. The shared modal adapter also moves initial focus into legacy dialogs and returns focus to a connected opener; nested previews use the same layer order. Reduced motion is respected.

## Appearance and branding

Light, Dark and System remain supported with business/customer accent inheritance. Dark controls use the same surface/text tokens, including the logo manager, preview cards, disabled controls, prices and public pre-order steps. Sidebar color follows the active accent and mode. Sign In/Sign Up retain the approved light card and white fields, including readable placeholders and dropdown arrows even when the surrounding preference is Dark. Those intentional light-auth colors are the exception to inherited dark surfaces.

The boot splash remains platform-branded with the default CounterNest logo. Business branding and theme load afterward. Uploaded business logos still drive the favicon; a clean workspace uses the default favicon; browser titles retain Business Name • CounterNest with the neutral fallback.

## Original-source media and removal

ProductImages.tsx reuses CatalogueMediaPromotion in Product Edit; no duplicate gallery database or price implementation is added. Preview opens the stored original, edit/crop loads that original into the existing crop pipeline, replacements create new objects, reorder/primary/removal save the actual original product media array. The UI labels immediate gallery saves. Old stored originals are not deleted by gallery removal/replacement. Server-side tenant/format/limit checks remain in save_catalogue_media.

Migration 91 adds only customers.active and its index, guarded removal helpers/RPCs/triggers, the backup allowlist field and active-customer selection rules. get_master_removal_policy returns a same-shop administrator-only decision. remove_master_record locks the original row and rechecks that decision before deletion/archive. All public foreign-key references, stock, aggregate customer history and scheduled-order JSON product references are checked conservatively. Any dependency is treated as history for preservation; there is no cascading erase through the UI.

Audit entries retain original IDs, actor and time. Direct API deletes cannot erase linked records or bypass administrator authorization; direct customer deletion is also revoked. Staff edits remain allowed under existing policies, while active-state changes require administrator authorization. Archived customers remain in historical joins, but are excluded from new pickers; new sales/orders reject a stale archived customer ID. Existing historical updates remain valid. The customer archive flag is included in workspace backups and restore allowlists; service-only controlled restore retains its existing lifecycle rules. SQL helpers are private, RPCs have fixed search paths and own-shop checks, and pending/inactive/temporary accounts cannot remove records.

Physical PWA, real storage upload/CORS and target hosting acceptance remain separate from local browser and migrated PostgreSQL tests. See the UAT checklist and known issues.


## RC11 additions

CatalogueAppearance stores a customer-only device preference, default Light, while shared tokens retain the business accent. Public business contacts use shared cards, fields, phone input and toggles. Order alerts use the same themed controls. Public contacts and device preferences have independent unsaved scopes; fingerprints exclude nested scopes so saving one section does not discard another section’s edits. Custom categories and all business product/brand/variant/option labels remain original data.


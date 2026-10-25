# CounterNest next update — RC19

2026-10-23. Based on the complete local RC18 source.

**Not tested, not build-validated, not type-checked, not configured against live services, and not deployed. No automated/manual/browser tests, UAT, screenshots, notification delivery tests or deployment verification were performed. No websites, external APIs, cloud databases, GitHub, Vercel or Meta were accessed.**

## 1. New

- Administrator-only WhatsApp Order Alerts settings: explicit recipient consent, separate private recipient number, country selector, pre-order/catalogue switches, summary/contact preferences and four notification languages. The public business number is never copied into this private setting.
- Private WhatsApp preference/delivery tables, authorized preference RPCs and a protected server dispatcher. It consumes the existing committed order events; no new notification work is added to the customer's submission transaction. Event IDs are unique across delivery attempts. The existing request snapshot supplies pre-order details; existing immutable selection item/total snapshots supply legacy catalogue selections. Legacy selections may have no customer contact information.
- Active / Archived / All customer filters, archived search and readable status badges. Archived customers can open the existing sales/order history and authorized loyalty ledger history. They remain excluded from active checkout/card/invitation selection. Administrators can restore the same customer ID using a workspace-scoped RPC and the existing activation audit trigger.
- A locally vendored libphonenumber bundle with numbering metadata, sourced from an already installed Office offline resource. No dependency download or package-manager operation was performed. See THIRD_PARTY_PHONE_NOTICE.md.
- ContactMethodIcon composes the existing local Lucide icon primitives with application-identifying symbols and persistent labels; it does not load remote brand assets.

## 2. Improved

- Catalogue contact defaults to WhatsApp when enabled in the existing allowed customer contact-method list, otherwise the first enabled method. Contact input starts empty. Existing draft/review/back navigation is retained. Disabled methods are not used as new defaults; no duplicate settings were created.
- Shared PhoneInput uses country-aware parsing, national significant numbers, AsYouType formatting, numbering-plan validity and E.164 normalization. Country search retains flag/name/calling code. International paste resolves supported country codes and shared-code regions. Typed excess digits are prevented at metadata limits; pasted invalid/overlong content is retained and flagged rather than truncated. New edited invalid numbers fail native form validation; explicit Catalogue review, customer save, business contact and WhatsApp saves also validate. The shared component benefits existing Catalogue, business, customer, supplier and other phone fields. No new staff-contact schema was invented where only email exists.
- Existing untouched customer phone values are retained when editing another customer field. No phone records are batch-normalized. Local metadata is not a proof that a number exists, belongs to a person, or can receive WhatsApp; recipient consent is independently required.
- Contact Business is centered with a wrapping icon row, consistent dimensions, visible mobile labels, accessible names and hover/focus tooltips. Enabled destinations use wa.me, tel, sms, mailto or configured HTTPS links. Non-launchable LINE/WeChat identifiers open details/QR instead of invented deep links. Disabled entries are hidden.
- Decline dialog has a 560px maximum width, 24px desktop/18px mobile padding, 8px field gap, a 110px minimum textarea and aligned footer actions. Related request dialogs share field spacing and a close control. Mandatory reason, decision RPC, concurrency check and history remain intact.
- The shared palette now derives Light surfaces from an appropriately light tint when the saved business background is dark. Only the selected appearance controls dark surfaces. Saved theme/accent values are not overwritten. Theme-color uses the same derived background. Dark/System behavior and contrast-aware text/button calculations remain shared across modules.
- New labels are localized in English, Spanish, Traditional Chinese and Simplified Chinese. User-entered names are retained.

## 3. Removed

- Replaced the single expandable Contact Business presentation button with direct enabled-method icons; identifier/QR details remain available.
- Removed the shared palette's inference that a dark custom background should force dark surfaces in Light mode.
- No business records, histories, operational modules or migration history were deleted. The obsolete New Sale Catalogue Selection pane was already absent from the active New Sale route in RC18; it was not recreated. The separate Catalogue component used elsewhere remains.

## 4. Preserved

- Existing New Sale direct-to-cart behavior, option/variant selection, repeated-tap quantity increments, independent desktop product/cart scrolling, sticky total/payment area and mobile View Cart/Back behavior are retained from RC18. No checkout, tax, payment, inventory or receipt calculation was changed.
- RC17 staff unread notifications, secure snapshots, Contact/Accept/Decline workflow, payment-safe alert queue and audit records remain. RC18 private Track Order links, PWA permission invitation, customer accepted/preparing/ready notifications, device preferences, subscriptions and service-worker audience handlers remain. Only the shell cache release identifier changed.
- Existing customer active flag and history links remain. Restoration updates active on the existing ID, never creates a duplicate. Existing archive-for-linked-history and safe-delete policy are unchanged. Restoration and loyalty-history RPCs require manual migration 97.
- Products/prices, customers/contacts, orders, sales/receipts/payments, inventory, recipes, purchasing, loyalty, staff/permissions, settings and audit/notification history are intended to remain preserved. No production data was accessed, so preservation has not been verified against live Supabase.

See MODIFIED_FILES_RC19.md for the added/modified source inventory and MANUAL_DEPLOYMENT_RC19.md for configuration. Existing test/build/QA reports retained from earlier source releases are historical, not validation of RC19.

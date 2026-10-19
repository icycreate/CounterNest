# CounterNest RC13 release notes

2026-10-18 · 2.0.0-rc.13

RC13 centralizes measured foreground/background pairs and enforces the shared Button paint contract. Remove, Delete, Archive, Decline, Clear, Reset and Void actions keep a strong red identity; disabled and loading labels remain opaque and readable. Cards, prices, fields, table rows, statuses, report panels, receipt toolbars and customer preorder steps use theme-safe colors. Staff Catalogue now initializes authentication and theme normally; token-bearing customer links remain public.

The eight shared variants support size, icons, loading, disabled, focus, hover, active and selected states. Icons inherit currentColor. Accent foregrounds are calculated from contrast rather than brightness guesses. Paint transitions no longer temporarily produce white text on a white button. Destructive actions retain red even when selected. Digital membership cards use a solid chosen color so their computed foreground stays valid across the card.

Readability changes preserve quantity conversion, gallery ordering, customer business names, four language support, contained full logos and the browser/cloud architecture. There are no new runtime dependencies and no SQL upgrades from RC12.

Validation covers 70 local browser scenarios with 5489 rendered text measurements, 126976 automated palette pair measurements, the full established test suite and production build. See the reports for scope and pending live/device acceptance.

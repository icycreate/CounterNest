# Accessibility and contrast — RC15

- Existing accessible-palette test exercises 126,976 pair measurements with normal text ≥4.5:1 and control/focus boundaries ≥3:1, including configured accents, light/dark and semantic button variants.
- Actual rendered browser button checks: 91 measurements across customer-light, customer-dark, cart-dark, admin-dark; 0 below 4.5:1. Minimum measured ratio: 5.52:1. Evidence: docs/redesign-screenshots/button-contrast.json.
- Shared Button continues to own foreground/background tokens, danger text, disabled text, loading state, hover/active/focus behavior. No opacity is used to fade disabled labels in the effective button contract.
- Customer navigation uses accessible names/current states, favorites use aria-pressed, search is labeled, quantity buttons are named and status changes announce through live status regions. The full-image viewer and contact sheet retain Escape/close/focus management.
- Keyboard and full-image controls were exercised in local component/browser checks; reduced-motion rules are present. Business names, category text and product names are not replaced with icon-only navigation.

This is a targeted audit, not a comprehensive WCAG conformance certification. Screen reader review, physical touch, forced-colors and all possible business images/content remain deployment UAT. The rendered-button measurements use opaque computed ancestor backgrounds; they are complemented by visual checks for image-backed areas.

# Responsive validation — RC15

Actual app rendered in the browser using isolated sample responses. Phone 390×844, tablet 768×1024, desktop 1440×900. 28 distinct after captures measured; 0 page-level horizontal overflow failures.

The customer interface uses bottom navigation on mobile and a sidebar on desktop. Product cards remain two columns on phones. Details keep original images with full-image view, thumbnails, count and touch handlers. Cart and form rows wrap. Admin tables retain columns inside horizontal scroll containers; page-level overflow is avoided. Admin navigation switches to its existing mobile menu. Sticky page/action behavior uses the shared components.

Evidence: docs/redesign-screenshots/index.html; measurements.json records actual viewport and document widths. The gallery includes all ten requested representative before/after views plus phone/tablet operational screens, checkout/review/confirmation, contact sheet and dark cart.

Browser actions verified: product options, full-image open/close, add to order, quantity/cart review, contact information, pre-order confirmation, subsequent cart, enabled contacts sheet, account appearance, all four languages, and product editing/gallery controls. Production records were never used. Physical touch/swipe, installed Android PWA, OS push and hardware remain UAT items.

## Measured after screens

| Screen | Viewport | Document width |
|---|---|---|
| after-catalogue-mobile | 390 × 844 | 375 |
| after-catalogue-desktop | 1440 × 900 | 1425 |
| after-product-detail | 390 × 844 | 375 |
| after-cart | 390 × 844 | 375 |
| after-checkout | 390 × 844 | 375 |
| after-review | 390 × 844 | 375 |
| after-confirmation | 390 × 844 | 375 |
| after-dark-mode | 390 × 844 | 375 |
| after-dark-cart | 390 × 844 | 375 |
| after-admin-dashboard | 1440 × 900 | 1425 |
| after-products | 1440 × 900 | 1440 |
| after-orders | 1440 × 900 | 1425 |
| after-ingredients | 1440 × 900 | 1425 |
| after-purchase-orders | 1440 × 900 | 1425 |
| after-settings | 1440 × 900 | 1425 |
| after-dashboard-390 | 390 × 844 | 375 |
| after-products-390 | 390 × 844 | 375 |
| after-recipes-390 | 390 × 844 | 375 |
| after-purchasing-390 | 390 × 844 | 375 |
| after-settings-390 | 390 × 844 | 375 |
| after-dashboard-768 | 768 × 1024 | 753 |
| after-products-768 | 768 × 1024 | 753 |
| after-recipes-768 | 768 × 1024 | 753 |
| after-purchasing-768 | 768 × 1024 | 753 |
| after-settings-768 | 768 × 1024 | 753 |
| after-catalogue-tablet | 768 × 1024 | 753 |
| after-contact-sheet | 390 × 844 | 375 |
| after-admin-dark | 1440 × 900 | 1440 |

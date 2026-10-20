# RC15 UAT checklist

Automated local suite and isolated browser checks are recorded in docs/rc15-validation. Checkboxes below are deployment/device acceptance, not claims of completed live testing.

- [ ] Staging login, signup, password recovery and role-specific navigation.
- [ ] POS sale, held sale, retry recovery, receipt/print/refund and current price validation.
- [ ] Product edit, gallery preview/crop/replace/primary/reorder, original image view, customer edit.
- [ ] Catalogue search/categories/favorites/detail/cart; pre-order submit/retry/status and staff accept/decline.
- [ ] Production, ingredients, inventory, purchase need, purchase order and stock receiving.
- [ ] Barcode scanner with physical device, calendar Month/Week/Day/Agenda and notification center.
- [ ] Real Web Push, foreground notifications, device registrations and badge behavior.
- [ ] Daily cash, reports, backup download and restore in a disposable staging workspace only.
- [ ] Settings, enabled contacts, custom logo upload/removal/fallback, custom accent, gallery settings.
- [ ] English, Español, 繁體中文, 简体中文; unchanged user-entered names and prices.
- [ ] Light/Dark/System; keyboard focus, touch targets, sticky actions and form validation.
- [ ] Android 390×844, tablet, desktop and installed PWA; offline shell, deep links and update activation.
- [ ] Authorized read-only before/after counts on the live deployment, accounting for legitimate concurrent user activity: products/customers/ingredients/suppliers/orders/pre-orders/purchase orders/inventory/recipes/staff.

Preserve production data throughout. No reset, reseeding or migration is part of RC15 acceptance.

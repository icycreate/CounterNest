# Mobile Refresh correction — November 4, 2026

Implemented in shared web/Android source:
- Refresh actions use a content-sized, non-shrinking button with a single-line label and 44px minimum touch target.
- The rule applies to existing Refresh buttons across the dashboard, catalogue and operational screens; click handlers and disabled behavior are unchanged.
- Adjacent translated text fragments are combined into one text item in the shared Button, preserving rich child elements.
- Action rows wrap whole buttons before squeezing labels. Normal labels break at word boundaries; long unbroken content retains an emergency wrap fallback.
- Spanish channel label uses the concise Correo.

Executed: TypeScript and production web build/Capacitor sync passed. Accessibility and customer-request regression passed. Refresh browser test passed 128 combinations (eight widths, four languages, two themes, normal/200% text sizing): one line, no clipping/overflow, 44px target, stable busy width and keyboard activation. Notification layouts passed in web mode (88 combinations, four channels) with offline API fixtures; this does not verify live push delivery. Incoming-order sizing passed 88 combinations after the shared action-row changes. Selected mobile English/Spanish screenshots inspected.

Physical phone findings:
- 60500 installed over 60401 but failed startup due to missing frontend Supabase build configuration. It is NOT a release APK.
- Restored the browser-safe configuration from the working v6.4 APK into ignored .env.local; no server credential was read or copied.
- Added Android build guard for required project URL and browser-safe key, rejecting missing configuration and privileged keys. Negative missing-URL check failed as expected.
- 60501 built and installed successfully. Screenshot directly confirmed Mrs. Su kitchen dashboard and saved Pin administrator sign-in. App data was not cleared.
- 60502 includes the Refresh fix in source. Its native build request was declined; no 60502 APK exists and the phone remains on 60501.
- Phone menu inspection was declined, so upgraded-device notification/settings tests remain pending.

No production frontend promotion, PR merge, or new order/notification test was performed. Do not mark the production release complete.

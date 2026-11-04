# Android 6.4 changelog

- Added Capacitor 8 Android project using the existing React/TypeScript application and neutral CounterNest assets.
- Integrated the supplied Firebase client configuration for com.counternest.pos and counternest-82288; excluded it and signing material from source control.
- Added Keystore-backed authentication storage, PKCE reset callback, native Back/resume handling and authorized order deep links.
- Added Android background FCM service with user binding, minimal payloads and event deduplication.
- Reused order events/devices/deliveries with an Android transport; added company controls, protected registration/revocation, bounded leasing/retries and attempts audit.
- Added secret-authenticated FCM HTTP v1 worker and user/admin-authorized, rate-limited current-device test endpoint.
- Added English, Spanish, Traditional Chinese and Simplified Chinese Android labels and localized push content.
- Preserved 6.3A email, in-app notification center, foreground sound controls and all existing order/payment/inventory logic.
- Added local database, worker and browser tests; prepared Android debug and unsigned release builds.

Backend activation, release signing and real-phone delivery acceptance remain required before production distribution.

## Phone sizing revision (versionCode 60401)
- Fixed dashboard grid minimum sizing that widened the Android viewport and clipped fixed navigation/order popups.
- Added responsive incoming-order action layout and long-text wrapping.
- Corrected Android splash/adaptive-icon safe zones and native system-bar insets.
- Verified nine real-phone screens and added 48 mobile popup/dashboard regression cases.

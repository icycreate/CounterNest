# v7 — Android APK Build & Device Testing Phase

## Direction

v7 is a direct continuation of the v6 PWA/mobile baseline. It does not redesign the POS and does not introduce a new Supabase schema. The purpose of this phase is to create the Android wrapper, sync the production web build, install it on Android, and validate the existing POS flows on a real device/emulator.

## Carried forward unchanged from v6

- Supabase Auth, RLS, multi-shop `shop_id` isolation and Storage policies
- Business signup/onboarding and editable business branding/logo
- POS checkout with Cash / Card / QR recording
- Products, inventory, customers and sales history
- Loyalty points, stamps, expiry, custom rewards and FIFO point consumption
- Customer, employee and loyalty cards with QR and printable/PDF layouts
- Receipt snapshots, reprints, refunds, voids and manager authorization
- PWA service worker, mobile navigation and offline checkout lock

## Phase 7 changes

- Application version advanced from `0.6.0` to `0.7.0`.
- Android package remains `com.chubbylu.bakerypos`.
- Added `npm run android:sync` to build the web app and sync it into Android in one command.
- Added `npm run android:run` for emulator/connected-device testing.
- Added `PHASE7_ANDROID_INSTALL.md` with Windows/Android Studio build and phone installation steps.
- Phase 7 acceptance checklist added for login, products, checkout, loyalty, receipts, settings, refunds/voids, and connectivity behavior.

## Database

No new Supabase migration is required for v7. Continue using all migrations through:

`supabase/migrations/20260816_business_onboarding.sql`

## Acceptance target

After the debug build passes device testing, create a signed APK/AAB release candidate using Android Studio's signing workflow.
- Corrected `tsconfig.node.json` with `noEmit: true` so TypeScript project-build settings are compatible with `allowImportingTsExtensions`.

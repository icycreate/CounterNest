# v6 — PWA / Mobile Installation Phase

## Added

- Installable web app manifest and PWA icon set.
- Production service worker with application-shell and same-origin static asset caching.
- Supabase/Auth/API requests excluded from service-worker caching.
- Offline startup guard for cloud-backed accounts.
- Offline connection banner for an already-open POS session.
- Checkout lock while offline to protect sales, inventory and loyalty consistency.
- Settings → App & Device installation/status panel.
- Browser `beforeinstallprompt` handling where supported.
- Dynamic browser theme-color based on the selected shop theme.
- Mobile top bar, fixed bottom navigation and More menu.
- Safe-area spacing for installed/mobile display modes.
- Capacitor 8.5 configuration and Android preparation scripts.
- Capacitor asset-generator source files for native app icon and splash screens.
- PWA launch/icon assets generated from the current ChubbyLu artwork.

## Database

No Supabase schema changes in v6. Continue using all migrations through `20260816_business_onboarding.sql`.

## Offline policy

v6 does not create offline sales or queue cloud writes. This is deliberate because sales affect inventory, customer history, loyalty balances, rewards and refund eligibility in one connected transaction model. Cloud writes resume only after connectivity returns.

# ChubbyLu Bakery POS v0.8.2 — Generic Hardware Profiles

- Added selectable ESC/POS USB, Bluetooth, and Wi-Fi/LAN profiles.
- Added Wi-Fi IP/port, Bluetooth identifier, and USB vendor/product configuration.
- Added browser capability indicators without claiming unsupported connectivity.
- Added optional cash-drawer pulse settings for printer connector pin and pulse duration.
- Added configuration validation and retained System Print as the working fallback.
- Kept all hardware preferences device-local; no additional Supabase migration is required.

Direct ESC/POS printing and physical drawer opening remain disabled until a real compatible printer is selected and tested.

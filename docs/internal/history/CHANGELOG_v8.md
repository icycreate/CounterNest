# ChubbyLu Bakery POS v0.8.0 — Phase 8 Hardware Integration

## Added
- Hardware & Receipt Printer panel in Settings.
- Device-local printer profile setting.
- 58 mm / 80 mm receipt paper selection.
- Test Print action using the existing system print path.
- Adapter boundary placeholders for future direct ESC/POS USB/Bluetooth support.

## Architecture decision
Phase 8 begins with system printing because it is the safest cross-device fallback for browser/PWA/Capacitor. Direct printer protocols will be added behind a separate adapter after real printer model testing. Click-to-sell remains the primary POS workflow; hardware scanning is optional.

## Database
No new Supabase migration is required for this initial Phase 8 scaffold. Hardware preferences are device-local.

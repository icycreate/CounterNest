# Phase 8 — Hardware Integration

## Current implementation
1. Open Settings.
2. Find **Hardware & Receipt Printer**.
3. Select **System Print**.
4. Select **58 mm** or **80 mm** paper.
5. Click **Save Hardware Settings**.
6. Click **Test Print** and select the connected printer from the operating system print dialog.
7. Complete a normal POS sale and use the receipt **Print** action.

## Phase 8 validation
- Test receipt on desktop browser.
- Test receipt through Android/Capacitor system print path.
- Confirm 58 mm and 80 mm layouts.
- Record exact printer make/model, connection type (USB/Bluetooth/Wi-Fi), and Android/Windows behavior.
- Only after a real device is identified should a direct ESC/POS adapter be enabled.

## Next Phase 8 implementation targets
- Select a real ESC/POS printer and verify its command set, USB IDs, Bluetooth mode, or network port.
- Activate the matching native/on-device transport adapter only after physical testing.
- Verify the optional cash-drawer pulse pin and duration against the selected printer manual.
- Physically test keyboard-mode scanners on Windows and Android.

## Phase 8.2 model-agnostic preparation

The POS now stores device-local profiles for generic ESC/POS USB, Bluetooth, and Wi-Fi/LAN printers. It also captures USB IDs, Bluetooth identifier, network host/port, paper width, and optional drawer-pulse settings. Capability indicators explain when a browser API is present versus when an Android/native adapter may be needed.

These profiles do not claim that a printer is connected. System Print remains the operational fallback until real hardware is purchased and direct printing is verified. The physical drawer pulse is deliberately gated behind that verification.

## Phase 8.3 barcode scanner

Products now have an optional shop-unique barcode. On New Sale, common USB and Bluetooth scanners configured as keyboard/HID devices can scan a code and send Enter to add the matching product. A visible barcode field also supports manual entry and mobile testing. Unknown and out-of-stock scans are rejected with a clear message. The original product buttons remain the primary fallback.

Apply `supabase/migrations/202608180810_product_barcodes.sql` after the existing migrations before assigning barcodes.


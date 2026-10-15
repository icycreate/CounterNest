# Phase 34.2 — POS Device, Receipt Printer & Cash-Drawer Setup

## Purpose

Phase 34.2 turns an already commissioned CounterNest LAN installation into a practical front-counter workstation. It verifies the actual POS device, receipt printer, paper layout, Daily Cash workflow, and physical cash-drawer opening method.

This phase does **not** publish CounterNest to the internet and does **not** require a public domain.

## What is implemented

- Administrator-only **POS Hardware Setup** navigation page.
- Workstation label such as `Front Counter 1`.
- Receipt-printer make/model and connection profile.
- 58 mm and 80 mm receipt-width verification.
- Physical test receipt from the application.
- Cash-drawer modes:
  - no physical drawer,
  - manual/key opening,
  - receipt-printer driver opening.
- Cash-drawer test print for printer-driver configurations.
- Link from hardware setup to **Daily Cash** for opening cash, cash in/out, count, and close verification.
- Hardware acceptance checklist.
- Workstation-ready sign-off stored locally on the device.
- Downloadable JSON commissioning record.

## Why hardware settings are device-local

Printer drivers, USB/Bluetooth connections, paper size, and the physical cash drawer belong to a particular counter workstation. They are not business-wide Supabase settings. Keeping these values local prevents one counter's printer configuration from overwriting another counter's configuration.

The accountable cash values themselves remain in Supabase through **Daily Cash**.

## Cash drawer behavior

CounterNest already tracks the accountable cash balance through Daily Cash:

1. Management opens Daily Cash and enters existing/opening cash.
2. Cash sales are recorded against the open cash session.
3. Cash in/out adjustments require a reason.
4. Management counts and closes Daily Cash.
5. Variance and closure evidence remain auditable.

Phase 34.2 adds the physical drawer setup only.

### Printer-driver opening

A web/PWA cannot safely claim that a physical drawer opened merely because a button was pressed. The new **Test Drawer Opening** action sends a small print job to the receipt printer. If the Windows receipt-printer driver is configured to trigger the connected RJ11/RJ12 drawer on print, the drawer should open. Management marks the test passed only after physically observing it.

Direct raw ESC/POS pulse commands remain deferred until a specific compatible printer/model and transport adapter are verified.

## Acceptance workflow

1. Name the workstation.
2. Enter the receipt-printer make/model.
3. Select connection and paper width.
4. Print a test receipt.
5. Confirm receipt width and legibility.
6. Select the physical cash-drawer mode.
7. Physically test the drawer if installed.
8. Open Daily Cash and verify management can enter existing cash and perform the daily workflow.
9. Confirm the printer/drawer fallback procedure.
10. Administrator selects **Mark Station Ready**.
11. Export the JSON station record for the internal deployment folder.

## Database

No new Supabase migration is required. Phase 34.2 remains at **53 migrations**.

## Next phase

After real receipt-printer and cash-drawer testing passes, the next internal phase should focus on final workstation acceptance / production handoff rather than public hosting.

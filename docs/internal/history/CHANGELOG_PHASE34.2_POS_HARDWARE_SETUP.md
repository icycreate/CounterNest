# CounterNest POS v1.25.0 — Phase 34.2

## Added

- Administrator-only POS Hardware Setup page.
- Workstation label and printer make/model profile.
- Printer connection and 58/80 mm paper settings.
- Physical receipt test workflow.
- Cash-drawer mode and connection notes.
- Printer-driver cash-drawer test print.
- Daily Cash shortcut for existing/opening cash verification.
- Hardware acceptance checklist and station-ready sign-off.
- Downloadable JSON hardware evidence.

## Preserved

- Internal same-network deployment only.
- Supabase Cloud backend and existing RLS.
- Existing Daily Cash/accountable cash architecture.
- Session auto-logoff from v1.24.1.
- System Print as the safe fallback.
- No raw ESC/POS drawer pulse claim without verified hardware.

## Database

No migration added. Migration count remains 53.

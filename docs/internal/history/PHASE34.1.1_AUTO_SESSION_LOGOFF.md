# Phase 34.1.1 — Automatic Session Logoff

CounterNest now supports a business-wide inactivity policy for shared internal devices.

## Default

- Automatic logoff: **Enabled**
- Inactivity period: **30 minutes**
- Allowed values: 5, 10, 15, 30, 60, 120, 240, or 480 minutes
- A warning appears during the final minute (or a shorter proportional warning for very small timeouts).

## Management workflow

1. Sign in as Administrator.
2. Open **Settings → Session Security**.
3. Enable or disable Automatic logoff.
4. Choose the inactivity timeout.
5. Click **Save Changes**.
6. The policy is stored in Supabase and applies when staff devices hydrate the shop configuration.

## Activity that resets the timer

Pointer/touch input, keyboard input, and wheel/scroll input count as activity. Backgrounded devices are checked immediately when the app becomes visible again.

## Timeout behavior

- CounterNest shows a warning with **Stay Signed In** and **Log Out Now**.
- If no action occurs, Supabase Auth is signed out.
- Unsaved cart/form work is cleared.
- Completed sales, Daily Cash, inventory, checklists, attendance, and other saved records are not changed.
- The sign-in page explains that inactivity caused the logout.

## Audit

Administrator changes to the automatic-logoff policy are stored in `session_security_audit` and appear in the unified Audit Log. Automatic timeout events themselves are not written as business transactions.

## Database

Apply migration 53: `202608261300_phase34_1_1_auto_session_logoff.sql`.

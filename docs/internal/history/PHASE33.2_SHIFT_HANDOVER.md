# Phase 33.2 — Shift Handover and Daily Operations Log

Phase 33.2 adds a shared handover record for staff responsibility changes. It does not replace Daily Cash, inventory, sales, or the incident register.

## Deployment

1. Verify a current business backup and retain the prior v1.14.0 package.
2. Test `202608241700_phase33_2_shift_handover.sql` in a separate Supabase project after migrations 42–44.
3. Apply migration 45 to production only after test results are accepted.
4. Install or rebuild CounterNest v1.15.0 and sign in as both an employee and administrator.
5. Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\RUN_PHASE33_ACCEPTANCE.ps1`.

## Workflow

1. The outgoing staff member opens **Shift Handover → New Handover**.
2. They select the shift and record a summary plus required pending actions. Enter `None` when there are no pending actions.
3. Optional stock, equipment, and `INC-YYYY-000000` incident references provide context without changing those source records.
4. A different active staff member reviews and acknowledges the handover with a note. The creator cannot acknowledge their own record.
5. An administrator reviews the acknowledgement and closes the handover with a final note.
6. The handover, acknowledgement, closure, staff identities, and timestamps remain in history and in the business backup export.

## Permissions and safeguards

- Active employees and administrators can create and read handovers for their own shop.
- Only a different active staff member can acknowledge an open handover.
- Only an administrator can close it, and closure is blocked until at least one acknowledgement exists.
- There are no application delete or direct mutation permissions.
- Do not enter passwords, payment-card data, authentication codes, Supabase keys, or unrelated private data.
- Use **Report Issue** as well when a fault needs formal incident tracking.

## Rollback

Return to the retained v1.14.0 application package if the interface must be rolled back. Do not drop Phase 33.2 tables or events from production; preserve them as operational evidence and obtain a reviewed database rollback plan if schema rollback is required.

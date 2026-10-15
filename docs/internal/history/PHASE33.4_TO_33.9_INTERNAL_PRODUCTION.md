# CounterNest POS Phases 33.4–33.9

## Outcome

This release completes the recommended internal-operations sequence and produces CounterNest POS v1.22.0 as an **internal production release candidate**. It does not publish the POS publicly and does not modify the established checkout, inventory, loyalty, Daily Cash, refund, void, incident, handover, or operational-task workflows.

## Phase workflow

1. **33.4 — Daily Checklists:** staff start the opening or closing run, complete required items with evidence, submit the run, and an administrator verifies or reopens it. A closing run cannot be submitted while Daily Cash is still open. Submitting a checklist never closes Daily Cash automatically.
2. **33.5 — Alerts & Escalations:** an administrator refreshes the queue. Server rules detect overdue tasks, unresolved critical incidents, and unverified prior closing checklists. Management acknowledges, resolves, or reopens each alert with an audited note. Source records are never changed by the alert.
3. **33.6 — Staff Schedule & Attendance:** administrators schedule non-overlapping operational shifts. Staff see their own shifts and clock themselves in/out. This is presence evidence only—not payroll, wage, overtime, tax, or employment-law calculation.
4. **33.7 — Operations Analytics:** administrators choose a date range to review sales, refunds, tasks, incidents, checklists, attendance, and alerts. A saved snapshot freezes the calculated view without changing its source records.
5. **33.8 — Security, Retention & Recovery:** management documents retention targets, runs a server security review, and records recovery-drill evidence. Automatic purge remains disabled. Restore drills must use a separate non-production Supabase project.
6. **33.9 — Internal Release Candidate:** management runs the final server gate. Approval is allowed only when every required control passes: active administrator, no unresolved critical alert, no stale Daily Cash record, passed security review, passed recovery drill, and a backup within the configured target.

## Database deployment

For an existing Phase 33.3 database, apply only these migrations in this exact order:

1. `202608251100_phase33_4_daily_checklists.sql`
2. `202608251200_phase33_5_alerts_escalations.sql`
3. `202608251300_phase33_6_staff_schedule_attendance.sql`
4. `202608251400_phase33_7_operations_analytics.sql`
5. `202608251500_phase33_8_security_retention_recovery.sql`
6. `202608251600_phase33_9_internal_release_candidate.sql`

First create and verify a current business backup. Apply and test the migrations in a separate Supabase project before production. Do not paste all six migrations into one SQL Editor tab; run them individually and confirm **Success. No rows returned** after each migration.

## Internal release sequence

1. Preserve the previous v1.16.0 ZIP and its SHA-256 file.
2. Verify the v1.22.0 ZIP SHA-256 sidecar.
3. Extract v1.22.0 into a new folder; do not overwrite the working v1.16.0 folder.
4. Copy the existing `.env` into the new project folder. Never place a service-role key in it.
5. Apply migrations 47–52 to a test project, run functional tests, then apply them to production in order.
6. Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\SETUP_COUNTERNEST_BROWSER_HOST.ps1`.
7. Test opening/closing checklists, alerts, employee schedule visibility, clock-in/out, analytics, security review, and recovery-drill recording.
8. Download a new business backup and its SHA-256 file.
9. Resolve required release-gate failures, run **Release Candidate → Run Acceptance Gate**, then have a named administrator approve the fully passed run.

## Separation and safety rules

- Checklist completion does not open or close Daily Cash.
- Alerts do not update or resolve the incident, task, or checklist that generated them.
- Attendance is not a payroll system.
- Analytics are summaries, not accounting statements.
- Retention values are policy records; no automatic delete function exists.
- Recovery recording never restores data and rejects an environment named `production` or `live`.
- Release-candidate approval does not deploy code or execute migrations.
- All new operational evidence is included in the v1.22.0 administrator backup.

## Rollback

If the new frontend fails before migrations are applied, close it and start the preserved v1.16.0 folder. After migrations 47–52 are applied, the v1.16.0 frontend remains compatible because the new tables and functions are additive. Do not drop the new tables to roll back the frontend. Database rollback, deletion, and restore require a reviewed maintenance plan and a tested backup.

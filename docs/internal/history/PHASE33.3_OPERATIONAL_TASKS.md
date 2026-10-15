# Phase 33.3 — Operational Task Assignment and Verification

Phase 33.3 turns operational follow-up into accountable work. Tasks can reference a handover or incident, but they do not change the source record, inventory, Daily Cash, sales, or loyalty data.

## Deployment

1. Verify a current business backup and retain the v1.15.0 package.
2. Test `202608251000_phase33_3_operational_tasks.sql` in a separate Supabase project after migrations 42–45.
3. Apply migration 46 to production only after the test is accepted.
4. Install or rebuild CounterNest v1.16.0.
5. Sign in with employee and administrator test accounts and run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\RUN_PHASE33_ACCEPTANCE.ps1`.

## Workflow

1. An administrator creates a task, selects its priority, optional due date, and optional assignee. Active employees may create a task assigned to themselves.
2. A source can be General, an existing `HO-YYYYMMDD-000000` handover, or an existing `INC-YYYY-000000` incident.
3. The assigned employee accepts responsibility with a note. An unassigned task can be claimed by an active staff member.
4. The assignee records a completion note describing the work and evidence.
5. An administrator verifies the completed task, reopens it for correction, or cancels a non-final task with a required explanation.
6. Every assignment and status transition remains in the immutable task event history and business backup.

## Permissions and safeguards

- Active staff can read the shop task board.
- Employees can create self-assigned tasks, claim unassigned tasks, accept their assigned work, and submit completion evidence.
- Administrators can assign or reassign active staff, complete when necessary, verify, reopen, or cancel.
- A task assigned to another staff member cannot be accepted by someone else; management must reassign it first.
- Completion is not final until an administrator verifies it.
- Tasks cannot be deleted from the application.
- Never enter passwords, payment-card data, authentication codes, Supabase keys, or unrelated private data.

## Rollback

Return to the retained v1.15.0 application package if the interface must be rolled back. Preserve Phase 33.3 task and event records as operational evidence; database rollback requires a separately reviewed plan.

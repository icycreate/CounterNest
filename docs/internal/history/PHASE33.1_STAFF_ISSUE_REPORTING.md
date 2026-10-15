# Phase 33.1 — Staff Issue Reporting and Manager Triage

Phase 33.1 gives active staff a safe **Report Issue** page without exposing the administrator incident register.

## Required migration order

Existing Phase 33.0 databases apply migration 44 only after migrations 41, 42, and 43 have succeeded:

```text
41. 202608241300_finished_product_recall_case_management.sql
42. 202608241400_phase32_internal_go_live.sql
43. 202608241500_phase33_operational_monitoring.sql
44. 202608241600_phase33_1_staff_issue_reporting.sql
```

Back up production and test migration 44 in a separate Supabase project before production.

## Staff workflow

1. Open **Report Issue**.
2. Select Low, Normal, or Urgent and choose the affected area.
3. Record factual details: time, device, receipt/reference, what happened, and the safe workaround.
4. Never include payment-card numbers, passwords, authentication codes, Supabase keys, or unrelated private customer information.
5. Submit and retain the permanent incident reference.
6. Use **My Recent Reports** to view status. Staff see only reports created by their own signed-in account.
7. Contact the manager immediately for a possible duplicate payment, missing paid sale, or wrong-business data.

Staff cannot edit, delete, classify, or resolve reports.

## Administrator workflow

1. Open **Operations Center**.
2. Review every new report and confirm its severity and category.
3. Add an investigation note and move it through Open, Investigating, Monitoring, or Resolved.
4. Use Critical only when the impact requires immediate stop/escalation handling.
5. Resolve only after verification. Reopening appends another immutable event.

## Permission boundary

- `report_operational_issue` requires an active staff profile in the signed-in shop.
- `get_my_operational_issues` returns only rows where `reported_by=auth.uid()`.
- `triage_operational_incident` requires administrator access.
- Direct table inserts, updates, and deletions are not granted to staff.
- Administrators retain the complete shop-scoped register through the Phase 33.0 protected functions.

## Acceptance

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\RUN_PHASE33_ACCEPTANCE.ps1"
```

The local test validates release identity, migration count, staff self-only lookup, administrator triage enforcement, the migration 41 hotfix, build output, and required files. Live database behavior still requires test-project validation.

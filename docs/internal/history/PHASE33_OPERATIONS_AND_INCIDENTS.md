# Phase 33.0 — Operations and Incident Management

Phase 33.0 begins the post-go-live stabilization stage. It does not publish CounterNest to the public internet, automatically repair business data, or replace payment-provider and Supabase support procedures.

## Before upgrading

1. Keep the complete v1.12.0 Phase 32.9 folder as the rollback application.
2. Export and verify a fresh CounterNest business backup and Supply Operations backup.
3. Apply migration 43 to a separate test Supabase project first.
4. Test sign-in, a low-value sale, receipt, stock, loyalty, Daily Cash, backup, and the new Operations Center.
5. Apply migration 43 to production only after the test result and rollback decision are documented.

Migration 43 creates `operational_incidents` and `operational_incident_events`, shop-scoped administrator policies, protected RPC functions, and extends the normal business backup to schema version 1.13.0.

## Daily workflow

1. Open **Operations Center** and review every failed or warning health check.
2. If an operational problem occurs, select **Report Incident**.
3. Choose severity and category, then record factual details, the affected device/receipt/reference, and business impact.
4. Never enter payment-card numbers, passwords, one-time codes, Supabase keys, or other secrets.
5. Move the incident through **Open → Investigating → Monitoring → Resolved**. Every update requires a note and appends an immutable event.
6. Resolve only after the correction has been verified. A resolved incident can be reopened, which creates another event instead of rewriting history.
7. Export CSV or print the current register for management review when required.

## Severity guidance

- **Low:** cosmetic or minor inconvenience with no financial/data effect.
- **Medium:** workflow disruption with a safe workaround.
- **High:** material sales, stock, cash, loyalty, or reporting impact requiring prompt management action.
- **Critical:** authentication isolation failure, wrong-shop data, missing paid sale, duplicate financial action, or another condition that requires stopping affected operations.

## Stop and escalation rule

Stop affected work if a paid transaction cannot be confirmed in Sales, shop isolation is in doubt, receipts and sales disagree, or repeated errors risk duplicate payment. Preserve the incident reference and evidence, use the Phase 32 rollback procedure only with management approval, and never change production records merely to hide an incident.

## Health checks

The Operations Center checks unresolved critical and aging incidents, prior-date open Daily Cash records, protected backup recency, open recalls, Phase 32 go-live evidence, and the current device connection. These are operational indicators, not automatic proof that every external service is healthy.

## Acceptance

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\RUN_PHASE33_ACCEPTANCE.ps1"
```

The script validates the release identity, migration count, required files, build, SQL delimiters, and absence of destructive incident deletion functions. Live Supabase behavior still requires the separate test-project workflow above.

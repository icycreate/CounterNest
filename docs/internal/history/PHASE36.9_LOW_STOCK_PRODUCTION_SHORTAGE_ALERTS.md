# Phase 36.9 — Low Stock & Production Shortage Alerts

Refresh compares active scheduled production recipe demand and ingredient reorder levels with usable lots. It also compares master product low-stock thresholds with usable finished batches. Shows required/available/short quantities, affected jobs, preferred/latest supplier, latest lot purchase price, purchase indication and severity.

Usable means active, non-recalled and non-expired. No alert purchases, moves or deducts inventory. Dismiss requires a reason and remains dismissed while shortage quantity/jobs are unchanged; changed demand reopens it. Resolve is allowed only when a refreshed shortage is covered. Every state/quantity change is audited.

Review independent variant stock in Variants → Adjust stock and forecast variant controls; the first consolidated alert table covers ingredient requirements and master product thresholds. Receive supplies through existing lot-aware workflows and refresh. Existing production completion remains the final FEFO inventory gate.

This phase is part of v1.54.0. Upgrade from v1.44.0 with migrations 68–77; read PHASE36.0_TO_36.9_UPGRADE.md and the UAT checklist.

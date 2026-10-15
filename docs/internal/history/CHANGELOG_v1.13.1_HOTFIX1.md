# CounterNest POS v1.13.1 — Phase 33.0 Hotfix 1

- Corrected migration 41 (`202608241300_finished_product_recall_case_management.sql`).
- The recall action row and recall-case status are now loaded using separate PL/pgSQL `INTO` targets.
- Both the action and case rows remain locked during the update workflow.
- Added an acceptance regression check that rejects the invalid multi-item row-variable pattern.
- No table, POS workflow, receipt, inventory, loyalty, Daily Cash, or Phase 33 feature was removed.

If migration 41 stopped with PostgreSQL error `42601: record variable cannot be part of multiple-item INTO list`, rerun the complete corrected migration 41 before migrations 42 and 43.

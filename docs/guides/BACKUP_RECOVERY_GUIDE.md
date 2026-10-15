# Backup and recovery guide
Use System & Settings → Backup as an administrator. Store exports in a protected location with restricted access; they contain customer/business records. Never paste exports into public issue reports.

RC1 preserves the existing portable business format and adds rc1_records with 32 newer collections (variants, catalogue, lots, conversions, preparation/variance, preorders/deposits, training and checkout recovery among others). Staff password/PIN hashes are excluded. File references are not the referenced image or attachment binaries.

Pause all mutations while creating/validating business exports so separately collected sections are consistent. Verify shop identity, schema_version 2.0.0-rc.1, counts, expected recent receipts/orders and the rc1_records section. Keep a dated copy and checksum.

This is not a complete disaster-recovery backup and has no automatic full restore. Supabase Auth users/passwords, Storage objects, platform settings/secrets and point-in-time history require separate backup/recovery procedures. Use your project's database backup facilities and retain Storage objects/configuration securely.

Rehearse recovery in an isolated staging project. Restore the database using the supported project procedure, restore Storage objects and policies, verify Auth/shop links and all historical counts, then run a controlled sale/refund/production/export reconciliation. Do not import JSON into production without an explicit reviewed mapping and restore test. Record recovery time and results before treating the backup as reliable.

The update also adds customer_request_records.requests/events to the business export. It includes selected contact details, consent preference and override reasons, so protect it as personal/business data. Verify these collections and the extended display settings/register station fields during recovery rehearsal. Existing rc1_records and root collections remain preserved; Auth/Storage exclusions remain unchanged.

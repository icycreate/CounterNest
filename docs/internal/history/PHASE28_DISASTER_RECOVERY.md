# Phase 28 — Backup and Disaster Recovery

Phase 28 protects CounterNest’s local installation and Supabase Cloud records. It can proceed without an Android release keystore. The signed Android release remains pending, but this does not prevent backup verification or recovery planning.

## Backup policy

- Export a CounterNest business backup after each business day and before every release or Supabase migration.
- Keep daily, weekly, and monthly copies according to management’s retention and privacy policy.
- Store the JSON backup and matching SHA-256 file together in encrypted storage accessible only to named administrators.
- Maintain at least two controlled copies, with one physically separate from the operating computer.
- Never include `.env`, passwords, PIN hashes, database credentials, Android keystores, or signing passwords in the business backup location.

Verify every selected backup:

`powershell -ExecutionPolicy Bypass -File .\scripts\VERIFY_BACKUP.ps1 -BackupFile <backup.json> -ChecksumFile <backup.sha256>`

The verifier checks the SHA-256 value and confirms that the file is valid JSON.

## Recovery rehearsal—never production

1. Create a separate Supabase recovery/test project.
2. Copy `.env.recovery.example` to `.env.recovery` and enter only that separate project’s URL and browser-safe key.
3. Keep the normal production `.env` present so the validator can prove the hosts are different.
4. Run `npm run recovery:validate-env -- -CheckCloud`.
5. Run `scripts\PREPARE_RECOVERY_REHEARSAL.ps1` with the selected backup and checksum.
6. Obtain named management authorization before any restore.
7. Restore only through the approved controlled procedure for the backup format and current schema. CounterNest intentionally provides no automatic production-restore button.
8. Complete `PHASE28_RECOVERY_TEST_CHECKLIST.csv` and retain the preparation JSON, restore log, counts, timing, defects, and sign-off.

## Incident runbook

### Lost or failed Windows computer

Revoke exposed sessions if necessary, preserve evidence, install the approved package on a replacement computer, enter the production configuration from the protected credential record, run diagnostics, and confirm the existing Supabase records. A computer loss normally does not require database restoration.

### Lost Android phone

Disable the affected staff account/session as appropriate, use device-management protections when available, and test a replacement device. Phase 27 signed update capability remains pending until a permanent keystore exists.

### Credential exposure

Stop affected access, rotate exposed credentials according to Supabase procedures, review the audit log, document the incident timeline, and retest permissions. Never paste replacement secrets into chat or frontend files.

### Failed local update

Stop the new launcher and return to the prior versioned folder only when schema compatibility is confirmed. Local file rollback is not database rollback.

### Supabase or migration incident

Stop transactions, preserve logs and backups, notify the project owner, and use the approved Supabase recovery path. Test corrective work in a separate environment first. Do not improvise destructive SQL or overwrite production to rehearse recovery.

## Completion gate

Phase 28 passes after a verified backup is restored into a separate recovery project, record counts and critical workflows pass, recovery time is recorded, defects are resolved or owned, management signs the checklist, and encrypted backup retention/custodians are documented.

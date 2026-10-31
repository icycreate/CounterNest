# CounterNest POS Release 6.3A — production implementation plan and evidence

Prepared 2026-10-31. Release 6.3B is indefinitely deferred. This report describes the reviewed change; the final live operation results are recorded separately after deployment. Do not interpret this document as proof of deployment or inbox delivery.

## Inspected baseline

Canonical repository: icycreate/CounterNest main, commit `2cd67a737165cb29d72e6556a15890cd1d1d9392` (RC30). Vercel production `counternest.vercel.app` serves that same commit; rollback deployment is `dpl_FMAXDCnbcjH3JzVw8BWqFB1XARtR`. Existing Vercel project `prj_Vp6JcHSaEQNTQY7GM2RWpHXCprSm`, team `team_5Cf9qiAhK9pfcgb86XrlIC16`. Existing Supabase project `onfhqlsovqkwrmjuuauy`.

Read-only production inspection found existing email settings/jobs/attempts, provider-aware worker RPCs and send-preorder-email version 10. The approved single business has email OFF, one prior submitted test and no queued order emails. No cron.job, application database HTTP functions or active email HTTP triggers were found. pg_net is installed; this release does not change its privileges, ownership or extension installation. No email HTTP dispatcher is enabled.

The prior 6.3A ZIP is a specification package, not a completed source release. Selected RC32/RC33 UI/provider/outbox work has been adapted to current main and current production schema. Newer local dashboard changes are outside this email-only release and are not copied over main. The first 105 repository migrations remain unchanged.

Migration fingerprint reconciliation uses the original Git blob bytes as the source of truth: nine historical fingerprints reflected CRLF checkout bytes and five did not match either canonical LF or CRLF bytes. Historical SQL is retained exactly; the manifest is corrected to canonical Git fingerprints with the previous values preserved in MIGRATION_FINGERPRINT_RECONCILIATION.json. No historical migration is reapplied to production.

## Resulting behavior

The customer pre-order/custom-cake form calls submit-preorder directly on Supabase. The service-only submit_preorder_edge transaction reuses the actual validated catalogue RPC, server price/rate-limit/idempotency logic, order records, existing in-app event and eligible durable email outbox. The Edge runtime starts the sender after commit. Order confirmation survives provider or dispatch failure.

Only the existing operator-approved shop and configured administrator recipient can receive real mail. The worker checks both shop identity and server-held recipient, even if a legacy multi-recipient flag is enabled. It also rejects CC/BCC, sender substitution and mismatched prepared payloads. No recipient editing, verification lifecycle, multi-business activation or 6.3B migration is included. The recipient address is not embedded in browser code or this public repository.

Settings uses existing shared components and translations in EN/ES/ZH-TW/ZH-CN. The recipient is read-only. Saved OFF blocks new jobs, cancels pending/retry jobs and blocks tests. Configuration revisions invalidate stale jobs. Already handed-off mail cannot be recalled. Settings tests and Retry pending emails use a user-authenticated, tenant/admin-authorized Edge route; they never expose worker credentials.

The secret-only send-preorder-email endpoint remains available for trusted operations. Public pre-order requests cannot supply recipient, shop ID, provider payload or worker job ID. The previous public submission RPC grant is removed only for writes; existing tracking/read/response endpoints and POS roles remain. Old installed clients must update/reload during cutover; they fail closed if attempting the removed direct write entry.

No Vercel email route/cron is introduced. No pg_net HTTP call is used. The RC32 optional Vercel relay was never in canonical main and is not copied into this release.

## Reliability and operational limits

Database uniqueness, immutable prepared payloads, lease tokens, stable Resend keys, five-attempt bound and 23-hour reconciliation cutoff are preserved. Provider acceptance is labelled submitted, never delivered. Ambiguous outcomes outside the safe provider window require operator reconciliation; do not create new keys or delete/requeue blindly.

Initial sending runs in EdgeRuntime.waitUntil after commit and continues after the catalogue closes, subject to runtime limits. Later submissions opportunistically process at most two due backlog jobs. A job that fails during idle hours requires administrator recovery; there is no claim of a continuously scheduled retry service. No extra project, paid service or alternate scheduler is created. If waitUntil is interrupted, the durable job remains recoverable.

## Local verification

See validation/release-63a/results.json and logs, plus validation/email/results.json and screenshots. Tests use synthetic data and mock provider transport. Database fixtures use PGlite with mocked Auth/Storage and omitted pgcrypto extension; they do not prove actual Supabase gateway behavior. Existing pre-order behavior fixtures now pass through the service-only Edge transaction RPC while preserving their original role checks for other APIs. A separate suite confirms anonymous/authenticated direct-write denial.

Required checks: actual locked dependency installation, typecheck, build, seven new integration groups, eight email handler groups, database regression, frontend, UI, checkout, PDF catalogue, web configuration and static release manifests. Browser evidence covers five widths and all four languages in light/dark (40 combinations). Existing eval/large-bundle warnings remain. There is no configured lint script, and the entire historical aggregate test chain is not represented as passing.

## Controlled deployment sequence

1. Confirm main has not advanced; if it has, merge/review the newer commit and rerun affected checks. Upload this focused branch, retain commit provenance and exclude generated historical reports, private backups and unrelated releases.
2. Preserve previous worker files and affected SQL function definitions/configuration outside public source. The inspected code/schema snapshots provide a targeted rollback checkpoint, not a full database backup or proven full restore. No order deletion or schema teardown is part of this release.
3. Deploy the reviewed Edge files/config first while settings remain OFF. New intake/recovery RPCs are absent until the next step, so new endpoints fail closed. Verify the existing sender is still secret-only.
4. Apply ONLY `20261031132856_release_63a_edge_email.sql` through the connected migration tool. Do not push all historical migrations to this existing manually provisioned project. Its conditional bootstrap is for a clean local install; in production it adopts existing tables. It turns email OFF and cancels unsent historical jobs without deleting orders or submitted history. It does not change pg_net privileges or enable any dispatcher.
5. Verify live RPC grants/RLS, fixed binding, no HTTP dispatch and clean order history. Deploy the tested Git commit through the existing Vercel connection. Do not change projects, domains, credentials, build services or unrelated functions.
6. Verify production READY points to the reviewed commit and updated PWA cache/build. Run invalid public request, direct-write and unauthorized admin/worker checks against actual gateway endpoints.
7. Activate only the existing single shop settings using a compare-and-swap revision check. Existing server secrets must already permit the restricted Resend path; never enable a general multi-recipient flag. If the server gate is OFF/missing, stop and ask the operator to configure it securely; do not retrieve credentials into logs or invent a success.
8. Submit exactly one clearly identified synthetic pre-order through the deployed endpoint/catalogue with a unique durable request key. Confirm one order/event/job, recipient match, provider submission ID and one attempt. Replay the same key and prove no extra order/job/provider submission. Verify actual inbox receipt separately; provider acceptance alone is insufficient.
9. Exercise saved OFF with another approved synthetic submission; confirm order/in-app event without email. Restore the intended enabled state via revision check and confirm no suppressed-order replay. Preserve test records/audit; do not delete production records automatically.

## Rollback

Contain by saving email OFF and pausing recovery/worker actions. Cancel pending/retry jobs; preserve in-flight/unknown evidence and provider IDs. Never enable old pg_net/Vercel dispatch. An email already accepted cannot be recalled.

Prefer a forward fix that keeps secure submission operational. If full code rollback is needed, restore the previous Vercel deployment above and previous worker version/files, then restore the saved affected function definitions and original validated catalogue-RPC grants as a coordinated baseline rollback. This restores RC30's token-validated submission contract, not a generic anonymous insert path. New secure endpoints may remain unused; revoke their execution if retiring them. Keep email OFF while validating checkout, catalogue tracking, authentication, in-app alerts and tenant isolation. Existing orders, settings/jobs/attempts and submitted history stay intact.

Use the local private pre-release function snapshot to generate reviewed SQL; do not run an invented destructive down migration, drop tables or restore a whole database over post-release orders. Resolve any uncertain provider attempt before resuming. Re-enable mail only for the approved pair after cause is fixed and checks pass. Release 6.3B must remain absent throughout rollback and recovery.

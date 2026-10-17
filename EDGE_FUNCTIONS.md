# Edge Functions to deploy

| Function | Required behavior |
| --- | --- |
| create-staff-account | Authenticated shop administrator; server-side temporary password confirmation; staff profile/audit; force initial change |
| change-initial-password | Active staff with must_change_password; verify current password; confirm new password; audit and clear flag |
| change-password | Active staff self-service; verify current password; confirm new password; audit |
| reset-staff-password | Shop administrator; target in same shop; temporary password confirmation; audit and force change |

From the source root, with Supabase CLI installed and authorized:

```sh
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy create-staff-account
supabase functions deploy change-initial-password
supabase functions deploy change-password
supabase functions deploy reset-staff-password
```

config.toml sets verify_jwt=false for all four because the handlers explicitly authenticate Bearer user JWTs using admin.auth.getUser, then verify active staff, admin role and shop boundaries. This supports newer Supabase signing-key configurations without relying on the gateway's legacy JWT check. These are not anonymous actions. OPTIONS permits CORS preflight; POST requires a verified user session. Deploy the supplied handlers and config together; never substitute handlers without their authentication checks.

The platform supplies SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY. Verify those runtime values are available in the target project. Do not put them in client variables, files or Git. Do not log request bodies or passwords. Existing handlers use generic errors and password-free audit metadata. Keep current-password verification on the server.

RC1 requires deployment of all four handlers together with migration 78 and the frontend. Input bodies must be objects with string fields; temporary-password administrators are blocked from create/reset. General password change directs pending users to initial change. Reset restricts the target profile before Auth update; if Auth fails, the account remains restricted until an administrator resolves it.

Business mutations (checkout/promotions/variants/bundles/deposits/preparation/forecasts/shortage workflow) are PostgreSQL RPCs in the preserved migrations; no additional function deployment is required for them. Functions have been locally tested with mocks; actual Supabase Auth/email/CORS behavior needs cloud acceptance.

References: [Function authentication](https://supabase.com/docs/guides/functions/auth), [Auth headers](https://supabase.com/docs/guides/functions/auth-headers).


## RC1 update build
No additional Edge Function or messaging integration is introduced. The same four handlers are retained byte-for-byte from original RC1. New request/contact/register functionality lives in migration 79. If all four current RC1 handlers are already deployed, verify their versions; otherwise deploy them together using the list above. Do not rerun migration 78 if already applied.


## RC5 workspace-lifecycle
Deploy supabase/functions/workspace-lifecycle/index.ts with ../_shared/workspaceArchive.ts after SQL84–87. The handler verifies JWT and ownership, reauthenticates current passwords for sensitive lifecycle actions, and is the sole service-role caller for lifecycle SQL. Keep SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY server-only. WORKSPACE_PURGE_ENABLED defaults disabled; enable only after staging restore UAT. Never expose these secrets in VITE variables or backups. Redeploy create-staff-account and reset-staff-password for the owner protections. The other two existing Auth handlers remain unchanged.

# Phase 30 — Direct Staff Provisioning

Phase 30 lets an active CounterNest administrator create a confirmed staff account directly in the POS. It does not send an invitation or confirmation email. The administrator supplies or generates a temporary password, gives it to the staff member privately, and the staff member must replace it immediately after the first sign-in.

## Production activation

The frontend alone is not sufficient. Complete both server steps in the same Supabase project used by CounterNest:

1. Apply `supabase/migrations/202608190100_direct_staff_provisioning.sql` after the first 19 migrations.
2. Deploy both protected functions:

   `supabase functions deploy create-staff-account`

   `supabase functions deploy change-initial-password`

Supabase-hosted Edge Functions provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server secrets. Never put the service-role key in `.env`, browser code, the Windows installer, or a screenshot. The frontend continues to use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Administrator workflow

1. Sign in as an active administrator and open **Staff**.
2. Enter the staff name, email, and role.
3. Choose **Generate** or enter a compliant temporary password twice.
4. Select **Create Confirmed Account**.
5. Copy the one-time displayed password and give it to the staff member privately.
6. The staff member signs in normally and creates a new private password before the POS opens.

The POS does not retain the temporary password. If it is lost before first sign-in, use the Supabase administrator recovery process; do not create a second account for the same email.

## Security and audit behavior

- Account creation is performed only by the Edge Function using the server-side service role.
- First-password replacement is also performed server-side; the function verifies the current password, changes it, clears the first-login restriction, and writes the audit event.
- The function validates the signed-in caller against `staff_profiles` and requires an active administrator role.
- The new Supabase Auth user is created with `email_confirm: true`; this marks the address confirmed without sending email.
- Creation fails and rolls back if the staff profile or audit entry cannot be saved.
- `account_created_directly`, later access changes, and `initial_password_changed` appear in the existing audit history.
- Inactive staff are signed out and cannot enter the POS.
- Existing email invitations remain as an optional fallback when SMTP delivery is configured.
- `supabase/config.toml` disables gateway JWT pre-validation for these two functions because each function performs its own live token validation with Supabase Auth. This is intentional; do not remove the in-function validation.

## Acceptance checks

- Administrator can create an employee and an administrator.
- Employee cannot call the account-creation function.
- Duplicate email is rejected without exposing account details.
- Temporary password is shown only after successful creation and disappears when dismissed or the page reloads.
- New staff can sign in but cannot reach any POS screen until the password is changed.
- The new password works after sign-out; the temporary password no longer works.
- Staff directory shows **Change required** before completion and **Private password set** afterward.
- Audit Log shows direct creation and initial password change.

Test in a non-production Supabase project first, then take a production backup before applying the migration.

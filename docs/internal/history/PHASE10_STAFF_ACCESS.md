# Phase 10 — Staff and Access Management

Administrators can invite staff by email, assign Employee or Administrator access, deactivate accounts, and review pending invitations. Invitation links expire after seven days and can only be accepted by an authenticated account whose email matches the invitation.

Access changes use protected Supabase RPCs and create immutable audit rows. Administrators cannot change their own access from the staff screen, and the database prevents removal of the final active administrator.

Apply `supabase/migrations/202608180830_staff_management.sql` after all earlier migrations.


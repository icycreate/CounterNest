# Supabase deployment
Follow SUPABASE_UPGRADE_GUIDE.md for real applied-level verification and the legacy-prefix caution. The update contains 79 migrations; a confirmed original RC1 database at 78 needs only the new file 79. All 78 earlier hashes are preserved.

Deploy the four account handlers in EDGE_FUNCTIONS.md with their supplied config; there are no new Edge Functions for this update. Customer requests, settings, contact authorization, schedule linking, register opening and audit/export extensions are database RPCs.

Configure Auth site/redirect URLs, email and Storage policies for staging/production. Keep service credentials only in Supabase. Set browser-safe build variables from ENVIRONMENT_VARIABLES.md in Vercel. Save customer methods/public URL in the app after migration, enable sharing, and test the printed QR from a logged-out device.

No live deployment or cloud inspection was performed. Complete UAT_ACCEPTANCE_CHECKLIST.md before accepting real operations.

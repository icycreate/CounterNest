# Supabase Cloud deployment

Use SUPABASE_UPGRADE_GUIDE.md to verify your current level. This source contains 81 ordered migrations. The latest delivered RC1 update at 79 needs only 80 and 81. If the earlier working-source migration 80 is already applied, apply only 81. Every delivered file 1–79 retains its hash.

The four account Edge handlers in EDGE_FUNCTIONS.md are unchanged; there are no new Edge Functions. Acceptance/decline/quotes/deposits/receipts, role workspaces/search/preferences, Realtime publication, contact restrictions, register opening and audit/export are database RPCs/policies.

Configure Auth site/redirect URLs and Storage for your staging/production origins. Service credentials stay server-side. Frontend VITE_* variables may contain only the public URL and publishable/anon key. Set VITE_ENABLE_DEMO=false. Verify RLS/roles, publication membership/Realtime delivery and polling fallback, actual email/password handling, uploaded product crops, protected public QR links and restore procedures in staging.

No live deployment was performed during package preparation. Complete UAT_ACCEPTANCE_CHECKLIST.md before production operations.

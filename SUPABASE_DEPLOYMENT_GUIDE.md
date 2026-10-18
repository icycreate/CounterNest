> RC11 update: apply migration 92 after RC10. See INSTALL_UPGRADE_GUIDE.md and NOTIFICATION_SETUP.md for current deployment variables, webhook and retry setup. The detailed base deployment guidance below remains applicable.

# Supabase Cloud RC5 deployment

Use INSTALL_UPGRADE_GUIDE.md and SUPABASE_MIGRATION_ORDER.md. RC4 needs only84–87; all87 apply to fresh databases. RLS remains enabled; ingredient package photos are private and delivered through short-lived signed URLs. No ingredient purchase data is added to customer catalogue projections.

Deploy workspace-lifecycle from supabase/functions/workspace-lifecycle with supabase/functions/_shared/workspaceArchive.ts. The handler validates the presented Auth JWT with getUser, checks shop/owner state server-side and re-verifies the current password for restore/delete/cancel/purge. Only the service-role Edge caller can invoke privileged lifecycle SQL; browser callers cannot impersonate p_actor. Configure platform Edge secrets, never VITE service keys. Redeploy create-staff-account and reset-staff-password for the owner protections. The other two existing Auth handlers remain unchanged.

Review workspace_owners backfill before production. Leave WORKSPACE_PURGE_ENABLED=false by default. An owner may cancel pending deletion within30 days. A permanent purge requires operator enablement after rehearsal, expired recovery, fresh password, exact business name and explicit confirmations. It is never scheduled by the browser.

The in-app backup limit is48MB uncompressed. Rehearse realistic database/file sizes against the target Edge memory/response limits and retain Supabase platform backups for larger estates. Supported uploads include product-images, shop-logos, catalogue-media, special-order-references, ingredient-packages, recipe-steps and supply-imports; external URLs and Auth accounts are excluded.

Local tests use PGlite with mocked Auth/Storage/PIN crypt and mocked Edge services. They do not deploy migrations or prove live Auth/Storage/Realtime/gateway delivery. Validate actual redirects, Storage upload/download, Realtime publication, five Edge functions and recovery before launch.

# CounterNest POS

2.0.0-rc.5 • 2026-10-17-operations1

Browser-first POS, customer catalogue, pre-orders and operational inventory. Architecture: browser → GitHub → Vercel → Supabase Cloud.

RC5 adds ingredient purchasing identification/private photos, approved substitutes, barcode/checklist receiving, approvals/mobile buying, production reservations, supplier/cost/waste intelligence, protected workspace backup/restore, setup, imports, presets and health. RC4 receipt, image-original, international-phone and customer PWA features remain included.

Use Node22.12+ below25. Configure public values using .env.example in a private .env.local. Run npm install and npm run dev; npm run verify builds and tests; npm run build creates dist. Never put a service-role key in a VITE variable.

Deploy the complete source, including api/, to Vercel. RC4 databases need only migrations84–87; fresh databases use all87. Deploy workspace-lifecycle with supabase/functions/_shared/workspaceArchive.ts. Keep Edge credentials in Supabase secrets.

Start with INSTALL_UPGRADE_GUIDE.md and DEPLOYMENT_NOTES.md. See RELEASE_NOTES.md, WORKSPACE_BACKUP_RESTORE_GUIDE.md, PURCHASING_INGREDIENT_GUIDE.md, PWA_CUSTOMER_GUIDE.md, UAT_ACCEPTANCE_CHECKLIST.md, BUILD_VALIDATION_REPORT.md and KNOWN_ISSUES.md. Secrets, node_modules, dist and native desktop artifacts are excluded from the source ZIP.

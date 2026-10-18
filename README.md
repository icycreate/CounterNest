# CounterNest POS — Customer Experience RC11

Version 2.0.0-rc.11 · 2026-10-18. Built from the actual System Style RC10 source.

Browser/Web Application → GitHub → Vercel → Supabase Cloud.

The approved bakery identity now supplies the platform fallback logo, boot logo, browser icon and installed-app icons. A business logo continues to replace the fallback on business-facing screens and documents.

Customer catalogues offer Light / Dark / System, default to Light on a new device, and retain the business accent. Explicit public contact methods are configured separately from the customer's preferred contact choice. Product, variant, option and brand names remain as entered. Known standard categories may localize; custom categories remain unchanged.

New request alerts include foreground popups, a device badge and a three-ring sound after browser audio activation. Background Web Push uses per-account device registrations, a transactional Supabase outbox and the protected Vercel dispatcher. Custom cake requests use the original Accept / Decline and scheduled cake workflow.

Upgrade from RC10: apply migration 92 before the frontend. Existing 91 migrations are unchanged. Run npm install, npm run build, npm test and npm run test:assets. Use Vercel build npm run build, output dist. Source ZIP excludes environment secrets, node_modules and dist.

Read INSTALL_UPGRADE_GUIDE.md, NOTIFICATION_SETUP.md, PWA_NOTES.md, BRANDING_NOTES.md, CALENDAR_USER_GUIDE.md, UAT_ACCEPTANCE_CHECKLIST.md and KNOWN_ISSUES.md. Validation is local; external push transport, live Supabase deployment and physical-device acceptance remain pending. No production deployment or database changes were performed during this build.

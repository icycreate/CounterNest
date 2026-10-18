# CounterNest POS — Navigation & Appearance RC8

Browser → GitHub → Vercel → Supabase Cloud. Version 2.0.0-rc.8, based on Boot RC7.

This release integrates protected internal Back navigation, shared Catalogue appearance, consistent light authentication, and the supplied boot storyboard's warm glow, tagline and loading bar around the official CounterNest nest logo. Existing bakery, purchasing, production and checkout functionality is retained.

Start with INSTALL_UPGRADE_GUIDE.md. Apply the single new migration after all 88 RC7 migrations, configure .env.example using browser-safe values, then run npm install and npm run build. Never expose a service-role key. The ZIP excludes .env files, node_modules, dist and native installers.

See NAVIGATION_THEME_IMPLEMENTATION.md, BUILD_VALIDATION_REPORT.md, UI_UAT_CHECKLIST.md, RELEASE_NOTES.md and KNOWN_ISSUES.md. Actual browser screenshots are in docs/screenshots; boot design frames are in docs/boot. This source is ready for GitHub/Vercel review; production deployment and real-device UAT remain separate steps.

# Build validation — RC15

- npm install --no-audit --no-fund: completed successfully using existing declared dependencies.
- npm run build: PASS (TypeScript and Vite production build).
- npm test: PASS; 250 PASS summary lines. Includes frontend, renderer, isolated database, deployment/static safeguards, requests/retries, four-language behavior, purchasing, calendar, PWA/push, theme, accessibility, branding and redesign checks.
- Exact logs: docs/rc15-validation/build.log and tests.log. Some esbuild test harnesses emit import.meta/CJS warnings; production uses Vite ESM.
- Existing main bundle remains above Vite's 500 kB warning threshold. Build succeeds; performance splitting is a follow-up, not a backend change.
- .env, .env.local, node_modules and dist are excluded from the release ZIP; .env.example is retained. Archive validation checks this after packaging.
- No Electron, NSIS, Capacitor or desktop packaging was introduced.

Local automated tests do not certify physical scanners/printers, OS notifications, installed PWA delivery or real Supabase/Vercel deployment. See UAT_ACCEPTANCE_CHECKLIST.md.

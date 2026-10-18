# RC8 build and validation

Version 2.0.0-rc.8, 2026-10-18T01:30:02.566Z. Local release candidate passed.

- npm install: 125 packages installed; zero audit vulnerabilities.
- npm run build: TypeScript and Vite production build passed.
- npm test: all suites passed, including 110 PostgreSQL checks, 8 boot groups and 11 navigation/theme groups.
- npm run test:assets: passed. Full logs are in docs/validation/.
- 88 baseline migrations are byte-identical. One additive migration brings the total to 89.
- 10 browser checks and 9 actual screenshots are recorded in BROWSER_QA_RESULTS.json and docs/screenshots/.

History tests cover modal-first Back, unsaved Stay/Discard, route transitions, nested image layers, bounded Home fallback, drawer navigation and forward behavior. Theme tests validate foreground/focus contrast, cache separation, authorized RPC metadata and private employee appearance. Database checks verify the public theme belongs to the token's business and helper privileges remain revoked. Recovery URL fragments are consumed before managed history is initialized.

Actual browser checks verified the Product Back sequence, nested Catalogue detail/image Back, white sign-in/sign-up under dark appearance, light Catalogue, dark/blue Catalogue and green mobile/tablet Catalogue. Preview uses fictional data. Screenshots are browser captures, not proof of physical installed PWA behavior.

Physical Android/iOS PWAs and gestures, Safari, real Supabase auth/recovery emails and staging deployment remain in UI_UAT_CHECKLIST.md. Existing production bundle-size and test-only import.meta warnings remain. Historical RC7 evidence files retain their original scope; current command logs and this report describe RC8.

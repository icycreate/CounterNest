# RC13 build validation report

2026-10-18 · 2.0.0-rc.13

Fresh npm install completed: 140 packages added, 141 audited, zero vulnerabilities reported, no new runtime dependency. npm run build, full npm test and npm run test:assets passed. Logs: docs/validation; exit codes: FINAL_CHECK_RESULTS.json. The production preview returned valid SPA shells and non-HTML asset responses across 51 routes.

All 94 migrations applied to local PGlite; 145 database checks passed. Every migration and 10 public image assets match RC12 byte-for-byte. Automated accessibility checks passed 126976 pairs plus eight Button variants, four languages, shared paint contracts and public/staff route regressions.

The actual-browser sample audit records 70 scenarios and 5489 text measurements without remaining recorded contrast findings or document overflow. There are 22 current screenshots under docs/accessibility; prior releases' evidence remains historical.

Vite's established large-chunk warning and test-bundler import.meta warnings are non-fatal. No runtime exception was found in reviewed fixture modules. Local PGlite mocks auth/storage and manager-PIN crypt; live cloud and physical installed-PWA acceptance remain pending. See KNOWN_ISSUES.md and UAT_ACCEPTANCE_CHECKLIST.md.

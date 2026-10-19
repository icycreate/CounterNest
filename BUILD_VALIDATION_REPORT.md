# RC14 build validation report

2026-10-18 · 2.0.0-rc.14

Dependency installation passed: 145 packages added, 146 audited, zero reported vulnerabilities. sharp is development-only; no runtime package was added. Production build, full npm test and built-asset checks passed. After final branding/cache adjustments, build, focused branding, customer PWA/receipt checks and assets passed again. Logs are under docs/validation and exit codes are in FINAL_CHECK_RESULTS.json.

The full established suite includes 145 local PGlite database checks, all 94 migrations and the existing UI/tenant/permissions tests. All migration bytes match RC13. 7 focused branding checks verify path-only vectors, alpha-preserving fallbacks, PWA/icon dimensions and related behavior, custom-logo URL/color preservation, legacy fallback classification, native image errors, contained preparation and print paths. Offline service-worker tests exercise the new logo formats while retaining API/tenant cache exclusions.

Local browser review: 18 scenarios and 34 visible logo measurements; loaded logos, contain geometry, no clip, transparent image background and no document overflow. 15 current screenshots are included. Production preview: 51 direct route responses and asset content types passed.

The current build retains Vite's established large-chunk warning. Test bundling may report import.meta warnings; these are non-fatal and visible in logs. PGlite mocks Supabase auth/storage and manager-PIN crypt. Target cloud, physical installed-PWA, native Save as PDF/printer output and real uploaded artwork acceptance remain pending. See UAT_ACCEPTANCE_CHECKLIST.md.

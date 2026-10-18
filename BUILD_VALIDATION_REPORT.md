# RC12 validation report

Dependency installation completed: 141 packages audited, zero reported vulnerabilities, no new runtime dependency. Production build, full npm test suite and built-asset checks passed. Logs are in docs/validation; FINAL_CHECK_RESULTS.json records exit codes.

All 94 SQL migrations applied locally. The original 92 migration bytes match RC11. 145 database behavior checks passed, plus the RC11 upgrade preservation fixture. New checks cover scientific factors, density rejection, tenant custom units, unchanged stock, source snapshots, partial receiving and retry idempotency, approval, source recipe versions, immutable order factors, gallery promotion/clearing, owned branding and backup/restore.

9 focused RC12 UI checks passed alongside every existing frontend suite. Token checks exercise standard and bright custom accents in Light/Dark, danger, success and disabled states. The catalogue was checked at 390/768/1280 px, with no document overflow and contained logo sizing. 10 sample-data screenshots are included; SCREENSHOT_GALLERY.md lists them.

Local results do not certify deployment or physical-device behavior. Staging UAT, live Supabase storage/RLS/Edge, external push, physical PWA install and human screen review remain pending. Existing large-chunk and test-bundler import.meta warnings are non-fatal and documented in logs.

Production preview: 51 direct route responses and built asset content types passed. The check validates the current boot shell and SPA fallback; Vercel hosting acceptance remains pending.

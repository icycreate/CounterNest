# Mobile dashboard hotfix — build 60502

## Scope and causes
Only shared responsive layout was changed. Existing authentication, orders, Firebase, email and Supabase behavior are untouched.

- src/mobileFoundation.css: keep the dashboard heading static. Its earlier sticky position combined with a transparent background allowed notification content to scroll behind it. Keep the mobile top bar sticky in document flow; the previous fixed bar relied on top padding overridden by later theme styles. Explicitly constrain logo bounds.
- src/mobileFoundation.css: compact two-column metric cards with minmax(0,1fr), 12px gaps, zero margins and natural heights; values and translated labels can grow without clipping. Constrain all five bottom navigation tracks and touch targets.
- src/mobileFoundation.css: let the inventory title/action row wrap, stacking the action on mobile. Reuse the existing nonshrinking, single-line shared Refresh style already in commit 38ea590; no new button implementation.
- src/ProductionOperations.tsx: remove overflow:hidden from the section container so it cannot mask layout collisions.
- tests/mobile-dashboard-hotfix.cjs: actual WorkspaceDashboard, ProductionOperations and MobileNavigation with synthetic data, no live backend.

## Executed checks
- TypeScript/Vite production build and Capacitor sync passed.
- UI component, accessibility and navigation/theme regressions passed.
- 256 offline layout cases: web and Android CSS modes, 390x844 first, then 320x568, 360x800, 375x812, 384x824, 412x915, 768x1024 and 1440x900; EN/ES/ZH-TW/ZH-CN; Light/Dark; zero/three notification records.
- Assertions: heading clears top bar; dashboard heading remains in flow during scrolling; no document/card horizontal overflow; Refresh remains one line with at least 44px height; mobile metric gap <=13px; five navigation controls fit with >=44px height.
- Android assembleDebug and lintDebug passed offline: 0 errors, 32 warnings.
- APK certificate SHA256 matches prior debug installation: 3ba3111813512552497bcf5f9f069b57b816caefd91ab5d76be1c177a2f6d044.
- Git diff whitespace check passed. No JavaScript lint script is configured.

## Evidence and limitations
validation/mobile-hotfix contains before/after screenshots and results. Before screenshots apply HEAD's prior shared CSS to the same fixture; they are not new physical phone captures. Screenshots use a placeholder logo, synthetic metrics/orders, and actual current components. The previously supplied photos remain the original user evidence. Android mode is Chromium with the native CSS class, not a physical WebView/system-bar test.

APK: com.counternest.pos, 6.5.0 (60502), debug-signed upgrade candidate. SHA256 D7DCC3F814A72B44BA956615AE9E045A058AB991014EB2EC420C0FA62F6E387E.
User deferred phone testing. No installation performed. Saved login and real status/navigation-bar behavior must be checked after upgrading the phone; matching identity/signature alone does not prove runtime behavior.

Existing broader release regression failures from the preceding local test report remain outside this hotfix. This work does not claim the full production gate is green. No production deployment, merge, database migration, credential change or backend release is authorized/completed here. Existing Draft PR #2 is the active branch; only this focused hotfix is added to its inherited work. Production remains held for review and deferred phone QA.

## Mobile web viewport follow-up
The viewport meta tag already used device-width. Mobile shell/main and dashboard/header sections now explicitly fill their containing width, with safe-area-aware 12px side padding and bounded header logo sizing. The fixture now includes UxHeader and uses an actual mobile browser context. All 256 cases passed, including full-width main and viewport assertions. TypeScript/Vite build passed. No zoom restrictions or overflow hiding added. This follow-up is source/web only; the previously packaged APK 60502 does not include this subsequent width refinement.


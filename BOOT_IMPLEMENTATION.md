# CounterNest boot implementation — RC7

Architecture remains Browser/Web Application → GitHub → Vercel → Supabase Cloud. This is integrated into the actual application startup, not a standalone animation demo.

## Launch lifecycle

index.html paints one platform-branded shell before the application bundle. It preloads the official default SVG and loads public/boot-screen.css as critical CSS. The head script chooses the last device appearance (light/dark/system, otherwise OS preference), applies the initial warm palette and records the launch timestamp. No business logo or tenant request is needed for the boot screen.

main.tsx starts one launch-scoped controller and mounts BootSplash in the existing boot-root; React replaces the static markup with the same logo/rings/details layout. The application mounts concurrently in root. The application root is inert and aria-hidden until the splash releases it. Animation offset is preserved from the initial HTML paint, so a late bundle does not restart the sequence. The decorative SVGs are hidden from assistive technology; the localized loading status is announced politely. No percentage is claimed.

App reports readiness only after its real auth/session hydration and the initial workspace/preferences result (or an error/recovery outcome). Logged-out startup goes to Login; logged-in startup retains the existing dashboard/page authorization. Configuration errors and ErrorBoundary release the branded overlay to reveal the actual recovery screen. Public catalogue loading also reports its ready/error result. An unresolved auth request remains unresolved; the splash never sets authentication flags or invents a completed session.

Fast startup can leave after a 1500 ms minimum plus a 220 ms fade (about 1.72 seconds). A slower ready state leaves as soon as ready; an absolute deadline removes the overlay at 3500 ms from the initial head timestamp. Reduced-motion users have no artificial minimum and a 120 ms fade after readiness, with static logo/loading treatment and no rings/decorative movement. Background/pageshow checks enforce the deadline on return. Repeat readiness signals and internal SPA navigation do not reset the controller. Hard refresh/new launch creates a fresh controller; a restored completed page does not replay.

A separate 4000 ms inline watchdog releases the app if the bundle never arrives. If no application content rendered, it presents a reload recovery message. If the bundle arrives later, its normal initial render replaces that message and the already-expired boot does not replay. A slow real auth check displays Checking your session; after 12 seconds it offers a reload action rather than pretending sign-in completed. Startup errors retain the application's existing recovery paths.

## Visual design and assets

BootSplash.tsx and public/boot-screen.css contain the reusable implementation. The official counternest-default-logo.svg supplies the existing nest geometry. counternest-boot-logo-dark.svg uses identical paths with warm dark-theme colors. Nest arcs, bread/cup/wheat line icons and a restrained indeterminate bar use SVG/CSS; no video, canvas, animation framework or new runtime dependency was added. Fixed logo dimensions avoid layout shift. Responsive styles cover portrait phone/tablet, short landscape viewports and safe-area insets.

The existing PWA PNG assets were inspected and still contained ChubbyLu artwork. icon-192, icon-512, icon-maskable-512, apple-touch-icon, favicon-64 and splash-1024 were regenerated from the official CounterNest SVG. The manifest's default theme/background are warm cream (#f8efe6), matching the HTML shell. The service-worker cache version is bumped and the critical CSS/default/dark SVGs are in its offline shell list. API/token responses remain excluded from cache.

Boot branding stays CounterNest in every tenant. After startup the existing business-logo/favicon behavior resumes. The default POS manifest uses CounterNest. Existing token-scoped customer Catalogue manifests retain their configured tenant name/icon rules; an OS may display that installed app icon/name before HTML runs. The animated HTML boot itself always uses CounterNest.

## Platform limits

Android/Chromium and iOS control their own native PWA launch screen; HTML/CSS cannot animate that OS screen. The default manifest provides a static matching foundation and transitions into the web boot. A dark web boot follows cached/OS appearance, while a browser may still use its stored light manifest splash first. iOS app snapshots, installed icons and old launch artwork may remain cached until the PWA is removed/reinstalled. No claim is made that this source overrides those OS behaviors.

Physical iPhone/Android/tablet installed-app checks, real slow-network traces and target Supabase startup remain staging UAT. Automated timing tests use a deterministic clock; browser QA uses the actual RC7 frontend with an isolated fictional adapter. docs/boot contains clearly labeled SVG/PNG design mockups of the key stages, not recorded browser video frames.

## Maintenance

Keep the static boot-root markup in index.html aligned with BootSplash when changing its structure. The loading text is localized once React starts; the first static HTML and bundle-failure/no-JavaScript recovery messages use English. Appearance is cached only as a non-sensitive device preference (counternest.appearance). Never cache auth results or business configuration for this animation. No database migration is required after RC6; all 88 migrations remain unchanged.

# Boot implementation — RC8

The launch lifecycle from RC7 is retained with the supplied storyboard's tagline, warm glow and wider indeterminate loader. See NAVIGATION_THEME_IMPLEMENTATION.md for the current integration and public theme bootstrap rules.

The production component is src/BootSplash.tsx. public/boot-screen.css loads before the bundle; index.html contains a synchronized static shell generated from that same component. src/startupLifecycle.ts waits for real readiness, uses a 1500 ms minimum plus 220 ms fade for fast launch and an absolute 3500 ms deadline. Reduced motion has no minimum, only a 120 ms fade. An independent four-second watchdog handles missing bundles. Authentication is never bypassed; a slow check shows the real session-pending screen.

All boot identity uses the official CounterNest default nest SVG, with palette-only dark SVG variant. Tenant branding is allowed only after the boot. PWA icons remain the corrected CounterNest assets from RC7. Browser-native PWA startup cannot be animated and may use cached icons/colors. Key frames in docs/boot are design mockups; docs/screenshots contains actual browser captures from this release's isolated fictional-data preview.

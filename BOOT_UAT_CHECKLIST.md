# Boot target-environment UAT

Local tests and mockups do not constitute physical-device or live-cloud certification. Record browser/device, operator, time, measured outcome and evidence.

- [ ] Fresh browser launch and hard refresh: one CounterNest boot; Login when logged out; correct authorized dashboard/page when signed in.
- [ ] Navigate between pages, open dialogs and resume a completed background tab: no repeated boot screen.
- [ ] Fast network: short minimum display and smooth transition; no extra wait for decorative assets. Slow auth/workspace: overlay releases by 3.5 seconds without signing in early; real loading/recovery stays usable.
- [ ] Bundle blocked/late: inline recovery is accessible after 4 seconds and reload works; a late successful bundle continues normally.
- [ ] Light, dark and system settings: startup chooses cached/OS palette without a white flash; normal business theme/logo/favicon resumes afterward.
- [ ] Reduced motion: static logo, no rings/icons motion or animated loader, no minimum wait beyond actual readiness plus simple fade.
- [ ] Desktop Chrome/Edge, portrait/landscape phone, tablet and short landscape: sharp logo, centered content, no clipped safe areas, no layout shift.
- [ ] iPhone Safari/PWA and Android Chrome installed PWA: inspect browser-controlled static splash → HTML boot → app. Refresh installed icons as required; verify no obsolete default artwork remains.
- [ ] Offline cached PWA launch: critical CSS/logo assets load; no token/API data are cached; actual offline/reconnect flow is still accessible.
- [ ] Keyboard/screen reader: hidden app cannot receive interaction during the splash; one readable loading status; normal controls become accessible on release; no flashing.
- [ ] EN/ES/zh-TW/zh-CN runtime status; CounterNest platform identity stays unchanged and tenant business content is untouched.
- [ ] Failed/revoked session, configuration error, password-setup and workspace-recovery routes remain reachable; no splash bypasses auth/permissions.

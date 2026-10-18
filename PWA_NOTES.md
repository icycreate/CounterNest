# PWA notes — RC11

The POS manifest, customer catalogue manifest endpoint, install prompts, same-origin shell worker and tenant-aware start URLs are retained. New fallback icon assets use the approved bakery mark. RC11 changes the shell cache version to invalidate the prior default logo. The worker continues to avoid caching Supabase/API responses and token-bearing navigation data.

Customer Light/Dark/System choice is local to each catalogue/device, default Light; the business accent is retained. Product detail and pre-order steps share that choice. Installed customer catalogue remains browsing/request intake; financial writes remain online and server-authoritative.

New Web Push and account binding are described in NOTIFICATION_SETUP.md. Permission/registration requires HTTPS and browser support. Clearing site data, changing browser profile or VAPID keys requires re-registration. Installed OS icon/name updates depend on the platform; reinstall if an old icon remains.

Local automated worker/manifest tests and responsive browser inspection are not physical installed-device certification. Complete iPhone/iPad, Android, tablet and desktop UAT before release.

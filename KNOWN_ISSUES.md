# RC8 validation limits

- Physical installed Android/iOS PWAs, Android system gestures, Safari, real Supabase sessions and live recovery emails remain staging UAT. Local browser checks use the actual frontend with isolated fictional data.
- Browser/OS may close a window or skip script-added history entries; the web app cannot intercept every system gesture. Within managed CounterNest history, Back uses modal/dirty/route/Home priority with a bounded root cushion. No explicit exit call is used.
- The shared dirty adapter covers native controls in existing forms, modal editors and declared scopes. New custom/contenteditable editors need an explicit dirty contract. Native browser reload/close prompts cannot use app-translated button text.
- Public Catalogue follows the business's published theme. Non-admin staff preferences stay private. Cached visual settings may be briefly stale while the latest protected response loads; no other tenant's cache is used.
- System-mode native PWA launch colors, cached icons and snapshots remain browser-controlled; static manifest splash cannot animate. Reinstall may be needed to refresh old artwork.
- Initial static/no-JavaScript/bundle recovery text is English; runtime navigation, theme and boot labels support all four languages.
- Existing Vite large-chunk warning and test-bundle import.meta warning remain. See PURCHASING_MODEL.md for inherited operational constraints.

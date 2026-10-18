# Navigation and appearance implementation

## Route and layer history

src/appNavigation.ts owns same-document navigation. Each cold document gets one base anchor and a current entry, while routes and dismissible overlays use indexed CounterNest history states. Back restores the URL before asking about edits, then applies the approved navigation. Root fallback replaces/replenishes a bounded two-entry home cushion rather than growing a redirect loop. The exact public Catalogue URL is its Home fallback; staff routes use /dashboard. Browser Back/Forward, the visible Back control and Escape share the adapter. No window.close or browser-history length heuristic is used. The browser/OS still controls tab/window closing and history jumps that skip the application.

Existing editor close controls carry data-back-close. A MutationObserver adapts only known overlay containers with an explicit close marker. Nested image previews register above product detail. Touch Back, cancel/close buttons, backdrop and Escape use the same guard. New dialogs must carry a close marker and use one of the documented overlay classes or data-back-layer. Modal Tab focus is bounded; the confirmation focuses Stay Here and returns focus on dismissal. Existing useDialogFocus retains dialog-specific focus behavior.

The shared guard fingerprints editable native controls when editing begins, excluding search, hidden, disabled and readonly controls. Important Product, Ingredient, Supplier, PO, Receiving, Customer, Staff, Pre-Order and Recipe editors use forms/modal containers; Settings declares an explicit scope and restores its App-owned preview values on discard. Saved/removed editors clear their tracked state; persistent editors can dispatch counternest:form-saved with their scope. New non-native/contenteditable editors must register an equivalent explicit dirty contract. Navigation confirmation labels support EN/ES/zh-TW/zh-CN. Browser reload/tab-close prompts remain browser-localized and cannot use custom button text.

## Shared tenant theme

src/sharedTheme.ts is the one palette builder. It validates six-digit hex colors, derives readable primary foreground and focus colors, and supplies CSS aliases for existing and new token names. src/sharedTheme.css replaces fixed Catalogue card/badge/button/search colors, keeps auth cards light, and supports shared light/dark/system behavior. Embedded POS Catalogue inherits its parent rather than creating a competing theme.

Migration 89 calls the existing catalogue RPC first, preserving token/permission/workspace-freeze checks, then selects the exact linked shop and whitelists primary/background/text/appearance only. The renamed helper is revoked from API roles. Accent/background/text are saved through the existing admin Shop Settings action. Admin appearance preferences also publish the business default; other employees' private preferences never alter the public default. This distinction is necessary because anonymous customers have no staff identity.

Public theme values are cached under the exact encoded catalogue token; another tenant link cannot reuse them. Only visual values are stored there, no customer content or auth result. A cached public mode controls the boot's initial palette; the latest authorized response takes over before the app is revealed. Existing public polling refreshes settings approximately every five visible seconds. In-app theme uses the validated shop response; obsolete unscoped theme storage is no longer read. No auth result is cached for boot/theme. Missing/invalid links reset public branding and palette.

api/catalogue-manifest.js uses the same returned business background and dark mode for its static launch colors. System native splash follows browser/OS limitations; HTML sharedTheme follows matchMedia live. Tenant favicon/title updates use validated workspace/catalogue data, preserve signed URL queries and return to CounterNest on logo removal or sign-out.

## Authentication and boot

Auth cards and business onboarding have an explicit light presentation regardless of app appearance. Password recovery only opens the change-password form after the SDK PASSWORD_RECOVERY event; no URL parameter grants that state. The UI uses normal Supabase recovery APIs, existing session rules and a 12-character mixed-case/numeric password check. Live email redirects need staging verification.

The supplied storyboard is a visual reference. The implementation keeps the official current nest SVG, rather than substituting the chef-hat drawing in the reference. Warm radial glow, subtly drawn rings, bread/cup/wheat details, the localized Sweet business / Simpler days tagline and wider indeterminate loader match its visual language. Initialization remains concurrent; fast startup exits around 1.72 seconds and absolute boot maximum is 3.5 seconds. Reduced motion removes decorative movement. The OS's static PWA splash remains under browser control.

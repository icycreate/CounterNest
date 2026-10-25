# Tooltip, hover text and popup contrast fix — RC21

2026-10-24. Complete source update based on CounterNest RC20.

**Untested. No automated tests, browser tests, screenshots, type checking, build validation or deployment were performed. No websites, remote repositories, Supabase Cloud, external APIs or production data were accessed.**

## Corrections

The existing contact tooltip was nested inside a button. Shared button rules forced its small-text color to inherit the button foreground, even though the tooltip supplied a different background. Its absolute positioning also allowed clipping and overflow near screen edges.

The new shared Tooltip/TooltipRuntime renders hover text in a body portal, outside button/sidebar inheritance and scrolling containers. Existing DOM title attributes and accessible icon-button labels feed this one component; the custom contact labels explicitly opt in with data-cn-tooltip. It temporarily suppresses the native title while the custom tooltip is active, then restores it. No page-specific translation engine or business action was added.

Neutral tokens are defined in one stylesheet:

| Resolved appearance | Background | Text | Border |
| --- | --- | --- | --- |
| Light | #222222 | #ffffff | #333333 |
| Dark | #ffffff | #202020 | #dedede |

The existing data-appearance attribute drives these pairs. System mode already resolves to light/dark through the existing shared theme listener; tooltip CSS follows that attribute automatically. The update does not change that listener, preference, palette calculation, business accent, sidebar/dashboard branding, logo, selected background or button configuration.

Tooltip backgrounds are opaque, text is not faded or blended, and descendant text inherits tooltip ink. No color/opacity transition reduces text contrast. These neutral pairs are selected to exceed the 4.5:1 normal-text target. Actual rendering across devices has not been tested or measured in this task.

Existing floating action menus, calendar filter panels, mobile menu sheets, store toasts and reusable menu/listbox/popover surfaces now use explicit shared surface/text pairs rather than inherited parent ink. Menu hover/focus, selected and disabled states specify paired foreground/background tokens. Dialog helper text uses the existing readable muted token without opacity fading. Read notification styling retains a border indication rather than fading the entire text. Plain toast text uses the neutral tooltip pair. Existing semantic status colors and shared button variant pairs remain intact.

Legacy button brightness and disabled opacity rules were removed at their source; the existing accessibility stylesheet continues to own button paint. Hover feedback retains outlines, border/box-shadow and underlining without changing every button to a neutral black/white palette.

## Interaction

- Pointer hover opens after a short delay; keyboard focus opens immediately. Short delayed dismissal avoids flicker when crossing into the tooltip.
- Escape and pointer-down dismiss without cancelling or replacing the underlying action. No click, cart, payment or order handler is modified.
- The tooltip is linked with aria-describedby while shown; pre-existing descriptions are retained. Titled icon-style shared Buttons receive an accessible name when one was not supplied.
- Positioning chooses above/below the trigger and clamps to the visual viewport with 12px margins, including zoom/mobile viewport offsets. It repositions on scrolling, resizing and content size changes. Long content wraps and has a bounded scroll area.
- Detached, hidden or inert triggers dismiss their tooltip. Language changes dismiss stale displayed text.
- Touch does not depend on hover. Contact method names remain visible under the icons, icon-only actions retain accessible labels, and no first-tap interception is introduced.

The runtime is mounted once at the application root, covering internal POS modules and public Catalogue/PWA routes: Dashboard/navigation, New Sale, cards/cart, Customers, Pre-Orders/dialogs, notifications, inventory/purchasing/production, calendar/reports/settings and customer/contact screens. Native OS/browser menus remain browser-rendered and use the existing resolved color-scheme; their pixel appearance is not controlled by custom tooltip CSS.

## Modified files

- Added src/Tooltip.tsx: shared portal tooltip and existing-label adapter.
- Added src/tooltip.css: neutral tooltip tokens and targeted floating-surface/interactive contrast rules.
- src/main.tsx: mount runtime once and load the shared correction stylesheet last.
- src/BusinessContacts.tsx: migrate contact hover labels; retain visible mobile names and destinations.
- src/nextUpdate.css: remove obsolete contact tooltip definitions.
- src/Button.tsx: accessible fallback names for titled icon-style buttons.
- src/buttons.css: remove legacy brightness filtering and faded disabled labels.
- public/sw.js: release cache identifier only; notification handlers unchanged.
- Package/release metadata, changelog, source notes, README and update instructions.

Complete inventory: MODIFIED_FILES_RC21.md. No SQL migration, database content, business record, permission, workflow, notification delivery logic or selected theme setting was changed. Historical validation reports retained from the supplied source are not RC21 evidence.

## Manual update instructions

Extract the complete RC21 ZIP and use it as the next source update through your existing release process when separately authorized. Preserve your private environment settings and existing database. No new dependency installation requirement, environment variable, migration or backend configuration is introduced by this correction; the 97 existing migrations are unchanged.

Deploy the updated frontend and public/sw.js together through the normal future hosting process. Existing installed PWAs may need to refresh/reopen to load the updated bundle. Do not reset/reseed the database or overwrite saved business themes. This task did not install packages, build, test or deploy the source. Read earlier release setup guides only for baseline features that still require their own external configuration.

# Permanent mobile-first QA foundation

Start every changed screen at 390 x 844 before adding tablet/desktop layout. Preserve the existing design system and application architecture.

Validate 320x568, 360x800, 375x812, 384x824, 390x844, 412x915, 768x1024, 1024x1366, 1280x800, 1440x900 and 1920x1080. Cover EN, ES, zh-TW, zh-CN and Light/Dark/System appearance. Never substitute a width-only or mocked-API pass for real-device functional acceptance.

Require readable text, 44px touch targets, single-column phone forms/full-width primary actions, bounded dialogs, safe areas, keyboard access, no unintended horizontal overflow or overlaps. Capture initial and scrolled views, expanded controls, dialogs, validation, loading and empty states for each changed page. Verify 200% zoom and long business names. Preserve notification history, payment protections, customer identity checks and tenant isolation.

A release report must have a Mobile-First QA section separating executed checks from pending physical-device and production checks. Missing release-blocking acceptance remains pending even when the build passes.

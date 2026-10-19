# RC14 release notes

2026-10-18 · 2.0.0-rc.14

RC14 replaces opaque bitmap-in-SVG fallback artwork with transparent vector paths traced from the approved CounterNest identity. A shared BrandLogo component keeps the full lockup in larger areas and the nest icon in compact areas, contains uploaded logos, selects platform ink for the containing surface, and recovers when a business logo fails or is removed.

Boot keeps its fade, nest rings, bakery details, loading indicator and startup deadline; the duplicate typeset wordmark is removed because the full artwork already includes CounterNest. Login and Sign Up retain the light authentication layout. Headers and sidebar use compact icons; Catalogue, receipts, reports, print headers and QR signage keep the full logo.

Standard brown/gold and inverse cream/gold vectors have PNG/WebP fallbacks. The favicon is icon-only and adapts to browser dark preference; PWA icons are regenerated, with an intentional cream canvas only for the maskable app icon and OS splash. No rectangular background is embedded in the logo artwork.

Business uploads retain their colors and transparency. Preparation now contains the full image by default; zoom is an explicit crop choice. Legacy server fallback paths are recognized as platform assets, allowing Dark Mode to work without changing historical SQL. Old public filenames remain small transparent compatibility aliases.

There are no database changes and no new runtime dependency. sharp is development-only for asset regeneration. Live cloud, physical installed-PWA and printer/PDF destination acceptance remain on the UAT checklist.

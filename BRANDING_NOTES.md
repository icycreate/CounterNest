# RC14 branding implementation

2026-10-18 · 2.0.0-rc.14

RC14 replaces opaque bitmap-in-SVG fallback artwork with transparent vector paths traced from the approved CounterNest identity. A shared BrandLogo component keeps the full lockup in larger areas and the nest icon in compact areas, contains uploaded logos, selects platform ink for the containing surface, and recovers when a business logo fails or is removed.

## Artwork and pipeline

The unchanged approved source is docs/reference/approved-brand-identity.png (SHA-256 in BRAND_ASSET_MANIFEST.json). The previous default SVG was 1,918,465 bytes and embedded an opaque source PNG. The new full vector is 204,756 bytes (59708 bytes gzipped). The production shapes and lettering are contour traces of that artwork, not replacement fonts. The six-color palette simplifies the source texture while preserving recognizable artwork. This is a derived production vector, not an original illustrator master.

Run npm run brand:assets after npm install. scripts/build-brand-assets.cjs reads the retained source, traces foreground contours, simplifies paths and exports full/horizontal/icon variants in standard and inverse palettes. Negative space is transparent. No SVG embeds a raster, external font or opaque background rectangle. PNG/WebP fallbacks retain alpha. Asset hashes and dimensions are documented by the manifest and tests.

Canonical full: counternest-logo-full-transparent.svg; horizontal: counternest-logo-horizontal-transparent.svg; icon: counternest-icon-transparent.svg. The corresponding -light variants use cream/gold on dark surfaces. counternest-logo-light.svg is an inverse alias and counternest-logo-dark.svg is the standard ink alias. Compatibility filenames default-logo, brand-lockup, boot-logo-dark and icon retain transparent contents for older database responses/bookmarks. Historical source artwork remains under docs/reference and is never a production logo download.

## Runtime rule

BrandLogo accepts mode (platform/business), logoUrl, businessName, variant (full/horizontal/icon), size, theme (auto/light/dark), className and decorative. It uses contain, no clipping, no rounding, no background fill and fixed intrinsic geometry. Automatic platform ink is selected from the actual containing solid surface; it follows theme/style changes and responsive layout. Authentication and receipt surfaces explicitly select standard ink for their light surfaces; onboarding follows its containing surface. Print picture sources always use standard ink. Uploaded business artwork is never recolored or filtered.

A missing/removed/failed business image returns to the correct platform variant; a failed vector gets its matching PNG. The server's legacy /counternest-default-logo.svg response is classified as platform fallback, so it cannot accidentally become a dark-on-dark custom logo. Business favicon URLs preserve signed queries; fallback uses the adaptive icon-only favicon.

## Integration

Boot HTML and BootSplash use transparent full artwork and matching inverse ink, retaining accessible status, decorative hidden icons, reduced motion and deadline behavior. Login/Sign Up, settings/onboarding, sidebar/mobile/header, public/admin Catalogue, Customer Display, card back, receipt and reports use centralized branding. Catalogue PDF and preorder receipt output use central standard print URLs; QR signage uses a contained full logo. Shared print-only business branding supports browser print output for operational, purchasing and inventory screens. CSV exports remain data-only formats. No existing financial or tenant logic was replaced.

Business logo preparation defaults to full-image contain with transparent padding; trimming is off by default. Explicit zoom can still crop. Existing saved crops cannot reconstruct the missing original edges; upload an uncropped original when needed.

## Performance and PWA

Critical boot artwork is preloaded. Branding does not gate startup readiness. The service-worker version is rc14-blended-branding and its platform asset whitelist includes new vector/fallback formats while excluding private data and API responses. Icon-only 64/180/192/512 PNGs are regenerated. The maskable 512 image reserves a safe inset on a matching cream canvas; the OS splash also has a matching cream canvas. Those intentional app surfaces are distinct from a white image box embedded in a logo.

## Validation and scope

BRANDING_TEST_RESULTS.json covers vector structure, alpha corners/negative space, sizes, theme routes, legacy mapping, custom URL/color preservation, failed-logo recovery, print sources, business preparation and PWA assets. docs/branding/BROWSER_BRANDING_RESULTS.json records visible loaded logo geometry. Screenshots cover the requested branded areas with isolated sample data; boot uses a fixed-clock actual BootSplash fixture. Physical installed-PWA UI, native print/PDF destination output and live cloud deployment require target-environment acceptance. See KNOWN_ISSUES.md.

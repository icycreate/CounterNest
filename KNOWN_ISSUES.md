# RC14 known issues and verification limits

The source is locally validated; no GitHub push, Vercel deployment or live Supabase change has been performed. Physical installed-PWA, OS icon rendering, native Save as PDF destinations and target printers need the UAT checklist. Local browser geometry/screenshots and generated print HTML do not replace those device checks.

The production vector is traced from the approved raster source with a simplified six-color palette. It retains the shape and lettering but is not an original design-file master. Custom business images keep their uploaded colors; their own opaque background cannot safely be removed automatically. Existing saved circular/square crops cannot recover lost edges without an original re-upload.

Arbitrary photographs and transparent business artwork may need owner review on their chosen surface. The platform fallback uses automatic inverse/standard ink, while custom artwork is intentionally preserved. Four legacy platform filenames are retained as transparent compatibility aliases for historical server values and old clients.

Existing operational limits remain: inventory/base-cost precision, remote crop-fetch CORS restrictions, historical stored images, external card/QR reversal workflows and the established frontend chunk-size warning. Earlier release audits/screenshots in this package are historical. Current branding evidence is under docs/branding.

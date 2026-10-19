# RC13 known issues and verification limits

No unresolved measured contrast failure remains in the recorded local scenarios. This is a local release candidate; no GitHub push, Vercel deployment or live Supabase changes were performed. Physical installed PWA, native date/time widgets, browser/OS preference changes and target-cloud acceptance remain pending. See UAT_ACCEPTANCE_CHECKLIST.md.

Custom photographic backgrounds and arbitrary real data/permission combinations still require visual acceptance. The audit does not certify all WCAG criteria. Digital card gradients use a solid chosen color to preserve a mathematically valid foreground.

Existing operational limits continue: inventory quantity precision is 0.001 base units and normalized cost precision 0.000001; US customary cooking units; remote image crop fetches can fail CORS; removed images remain in storage for history. External card/QR reversals require the provider. Large established frontend chunks produce Vite size warnings.

Screenshots use isolated sample records. Earlier release reports/screenshots remain historical; current readability evidence is under docs/accessibility and BUILD_VALIDATION.json.

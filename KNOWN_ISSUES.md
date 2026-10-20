# Known issues and validation boundaries — RC15

- Not deployed to GitHub/Vercel or connected to production Supabase in this task. Live record counts and end-to-end cloud acceptance are pending.
- Android installation, physical barcode/receipt hardware, external email/contact apps and real Web Push require device/staging acceptance.
- The existing main JavaScript bundle triggers Vite's size warning. No functional build failure.
- The UI uses real business-uploaded photos. Screenshot fixtures contain only two sample products, so they do not reproduce the reference's five-product assortment or its exact food photography. No production demo products were created.
- Featured flags are labeled Featured, not falsely presented as measured popularity. Existing dashboard metrics are preserved instead of inventing the reference's numbers or growth percentages.
- Explicit TV/kiosk/counter/POS catalogue modes retain their workflow-specific layout. Ordinary customer catalogue routes use the new storefront.
- Existing report files from earlier releases remain for history; RC15 status is authoritative in BUILD_VALIDATION.json, the RC15 reports and docs/rc15-validation. Earlier version labels in component test result files identify their original test family.

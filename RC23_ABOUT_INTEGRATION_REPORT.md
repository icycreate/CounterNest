# RC23 — Existing About page integration correction

2026-10-24. Based on RC22. NOT TESTED, NOT BUILT, NOT DEPLOYED.

## Corrected destination
The existing `page === 'about'` branch in `src/CustomerStorefront.tsx` rendered Picture 3's editorial page with hardcoded CounterNest copy and a photograph drawn from the hero product. It now renders `CustomerAboutPage` from the same saved About Us configuration used by the existing Settings editor. This is a replacement of that branch, not a second route or page.

The RC22 About section on the home storefront has been removed. Product browsing markup, product images, hero/banner logic, categories, sidebar entries, Account links and footer links are unchanged. The existing About CounterNest navigation item still opens the same `#about` route, regardless of visibility settings.

## Field mapping
| Administrator field | Existing About page presentation |
| --- | --- |
| Business heading | Large editorial H1 |
| Short introduction | Lead introduction |
| Business story | Story paragraphs; blank lines separate paragraphs and line breaks are preserved |
| Highlighted statement | Existing blockquote-style emphasis, optional |
| About Us image | Editorial photograph, exclusively from the dedicated About Us image path |
| Alternative text | Editorial photograph's alt text |
| Language | Selected customer language with per-field fallback to the configured default |
| Show About Us | Published content or neutral unavailable presentation on the same route |

The small About CounterNest eyebrow and navigation label remain system labels. Business text is rendered literally and never auto-translated. Existing device detection and manual language preferences are untouched. The shared image applies to all languages.

## Presentation and media
Existing store-story heading, lead typography and blockquote styling are reused. Scoped CSS arranges the photograph on the right on desktop, and introduction / photograph / story / highlight in that order on mobile. Long words and line breaks wrap; images retain their intrinsic proportions. Existing theme variables remain unchanged. No unrelated stylesheet or storefront layout was redesigned.

The Settings editor is preserved, with one optional highlighted-statement field added. Its preview uses the same editorial renderer. Upload, crop, reposition, resize, replace, remove, restore, preview and save continue to use the private catalogue-about bucket and the saved image_path. No product photo, logo or gallery field supplies the About photograph. Removal never falls back to a product image.

Unpublished drafts remain local. The existing upload-before-transaction, revision conflict check, workspace/admin authorization and retained-image behavior remain. Disabled/unconfigured content and fetch failures display neutral localized states, never the removed promotional copy. New sessions and refreshes fetch saved content; an open About page refreshes while visible every 60 seconds. Signing delays/failures do not substitute another photograph.

## Schema and limitations
The optional `highlight` key uses the existing JSON configuration; no new table, duplicate profile or storage bucket is introduced. The additive `202610241300_about_page_highlight.sql` migration only replaces the validation function to allow an optional string of up to 1,000 characters. Existing RC22 records without that field remain valid and are not rewritten. Apply this migration before saving the new field.

The current attachment contained the written descriptions of Pictures 1–3 but no screenshot image files. Implementation used those descriptions and the inspected existing source layout; no screenshot-based visual verification is claimed.

No tests, typecheck, builds, browser runs, migrations, external service calls or deployments were performed. Previous reports/logs in this source are historical. Previously documented unrelated test failures remain unresolved. Signed image URLs can remain valid for up to one hour after content is disabled; retained object cleanup still follows RC22's manual procedure.

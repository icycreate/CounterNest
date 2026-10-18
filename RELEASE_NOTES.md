# CounterNest Navigation & Appearance RC8

The customer Catalogue now receives the business's published visual settings through its existing protected link. Main app, public Catalogue, product details, QR screens and embedded selection share one palette and reusable search/button styles. Light/dark/system and orange/blue/green accents use the same source; the existing grid and filters are preserved.

Back closes an open image, modal or mobile drawer before returning to an internal route. Modified editors show localized Stay Here / Discard & Go Back controls. A bounded home cushion provides Dashboard or the exact public Catalogue link when no useful route remains. Settings discard restores its inline App state. Reload/tab-close uses the browser's native unsaved-changes prompt.

Sign In, Sign Up, business onboarding and password screens retain white cards, readable fields, accent actions and password eyes even when the app uses dark mode. Forgot/reset password flows use Supabase recovery events.

The platform boot keeps the official CounterNest SVG and adds the supplied storyboard's two-line tagline, warm glow and wider indeterminate loader. It remains launch-scoped, capped at 3.5 seconds, responsive and reduced-motion aware. Business title/favicon behavior resumes after startup and clears on sign-out.

Upgrade: apply migration 89, 202610171500_shared_catalogue_theme.sql, before deploying this frontend. All 88 earlier migrations are unchanged. Physical PWA and live Supabase/email recovery verification remain staging checks.

# Installable customer catalogue

Open a business's protected `/catalogue?token=…` or `/catalogue-display?token=…` link, then choose **Install Catalogue App**. The customer app always starts at that exact business's `/catalogue?token=…` page. It contains the public catalogue; staff sign-in, management navigation, costs and private records are not part of this view.

On supported Chromium browsers, the button opens the browser's installation prompt once the browser offers it. Dismissing the prompt leaves the button available for a later attempt. On iPhone and iPad, open the link in Safari and use Share → Add to Home Screen. Other browsers show their menu instructions or a bookmark fallback. The instructions follow the selected English, Spanish, Traditional Chinese or Simplified Chinese language. Standalone windows show the installed state.

## Deployment

Deploy the complete repository to Vercel, including `api/catalogue-manifest.js` and the explicit API rewrite in `vercel.json`. Configure the same `VITE_SUPABASE_URL` and public `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy `VITE_SUPABASE_ANON_KEY`) used by the frontend in the Vercel project environment, then redeploy. No service-role key is needed or accepted. The endpoint calls only `get_commercial_catalogue` as anonymous, so expired/disabled/invalid links fail through the existing token validation. The capability token must be kept private like the catalogue link itself.

The persistent HTTPS manifest uses a tenant-specific stable `id` and `start_url`; its path scope is `/catalogue`. The manifest name comes from the validated business name. A safe HTTPS business-logo URL is offered as an any-size app icon, with CounterNest 192/512 PNG and maskable fallbacks. The browser selects the icon it supports; unusual dimensions, inaccessible logos or platform constraints can result in the CounterNest fallback. On iOS, the available business logo is also selected as the Apple touch icon after catalogue data loads. The normal browser-tab favicon always remains CounterNest. Existing installed apps may require browser refresh or reinstallation to pick up later business-name/logo changes.

A plain Vite preview or static-only host does not execute Vercel API functions. It still opens the customer catalogue and shows add-to-home-screen/bookmark guidance, but automatic tenant-aware installation requires the API deployment. Never replace the endpoint manifest with the staff `/manifest.webmanifest`, which starts at the POS root. Staff installation keeps that separate staff manifest.

## Network and offline behavior

The shared service worker caches only the application shell and static assets. It excludes all API traffic, Supabase/Auth traffic, cross-origin images/data and token-bearing navigation responses. It does not store customer orders or catalogue data for offline use. An offline catalogue launch preserves the original public URL and shows its connection error/Refresh action; it never redirects to an administrator screen. A connection is required to browse current products, prices and availability or send a request. Service-worker updates wait for normal launches and do not submit or alter transactions.

## Release checks

Run `node tests/customer-pwa.cjs` for manifest identity/isolation, anonymous endpoint, revoked token, timeout/config failure, caching and install UI checks. On the deployed HTTPS site, install two businesses from their own links, close/reopen each icon, and confirm the matching business catalogue, branding and language. Check Chromium's native prompt, iPhone/iPad Share flow, unsupported browser guidance, a revoked link, and offline launch. Local automated checks cannot certify native OS installation or device icon selection.

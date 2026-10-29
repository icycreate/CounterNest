# RC27 — Customer Catalogue tutorial video

26 October 2026. Built offline from RC26; no live services or orders were accessed or changed.

## Delivered

- Approximately 80-second portrait MP4, 720 × 1280, H.264, English captions burned into the picture, no voiceover or audio track. Local app demo screenshots show browsing, options/quantity, cart, contact details, review, mocked submission and the private tracking-link button. Installation is explained through instructional cards for iPhone Safari and Android Chrome; it is not a recording of an actual phone installation.
- WebVTT captions and an English transcript.
- Customer-facing “Watch: install & place an order” control in the existing Catalogue/customer display, with a dismissible first-visit invitation on Home. The video plays only after explicit user action, uses native controls/inline playback, and does not download on the first visit before the player opens. It is not forced over the screen.
- Reopenable guide, written fallback steps, and an installation-options button that navigates to the existing Account screen. The existing Install Catalogue App control still owns browser installation. The guide does not request installation or notification permission automatically.
- Controls use the four-language system; video and written tutorial content remain English as requested. Dismissal is stored on this device per Catalogue, independently of staff tutorial progress. Storage failure does not block the guide.

## Verified locally

TypeScript/production build and release checks passed. Eight browser groups passed: invitation/dismissal and no initial video download; explicit playback and transcript; 720 × 1280 decoding with duration 79.744 seconds; accurate seeking and decoded frames; four-language controls; mobile/tablet/desktop Light/Dark layouts; failed-source transcript fallback and installation navigation; independent Catalogue preferences with no runtime errors.

Representative frames at 3, 24, 55 and 73 seconds were decoded and inspected. The video container was finalized locally with the installed VLC tool to provide reliable duration/seek metadata. Local video serving in the test supports HTTP byte ranges. There is no audio track: recording uses only a canvas video stream.

The footage uses a fictional Demo Customer and a reserved demonstration phone number. Order submission is mocked; no real order or message was created. Actual iPhone/Android installation, live backend ordering, live push and physical device playback were not tested. Full legacy regression was not rerun; the previously documented RC25 legacy-suite failures remain unresolved.

## Deploy manually

No database migration, new dependency or secret is required over RC26. Deploy the complete source using the existing process. The production build must include `public/tutorials/customer-quick-start.mp4` and `customer-quick-start.en.vtt`. Serve them as video/mp4 and text/vtt, with normal HTTP byte-range support for reliable seeking. Do not rewrite these existing files to the SPA index page.

The service-worker cache version is rc27-customer-video. The movie is not added to the offline precache, to avoid a compulsory video download; playback needs connectivity unless the browser has cached it. The written steps remain in the application bundle. Refresh/reopen older installed PWAs after rollout.

Use the standalone MP4 for sharing or signage. The complete RC27 source ZIP contains the integrated player, video, captions, tests and transcript. The video explains that installation is optional, browser support/HTTPS are needed, pickup time can be agreed later, and submission is not a confirmed booking or payment.

This update remains undeployed. No live system was modified.

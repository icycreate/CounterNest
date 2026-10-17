# RC7 validation limits

- Native iOS/Android PWA splash screens, launcher icons and cached snapshots are controlled by the OS. The HTML boot cannot animate or forcibly refresh that native screen; reinstalling the PWA may be required for old icon artwork.
- Physical installed-PWA/device and target Supabase startup checks remain pending. Local browser checks use fictional startup responses; deterministic timer/component tests cover the bounds and failure paths.
- Initial static HTML, no-JavaScript text and bundle-failure recovery are English; runtime boot/session text supports EN/ES/zh-TW/zh-CN.
- The existing large-bundle production warning remains. The boot assets are small SVG/CSS and do not add a video or animation dependency.
- RC6 purchasing constraints remain documented in PURCHASING_MODEL.md and its UAT checklist.

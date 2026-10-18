# RC12 release notes · 2026-10-18

Implemented from Customer Experience RC11. Adds ten scientific units, workspace custom units, explicit ingredient purchase/recipe profiles, package-size PO previews, immutable source snapshots in purchasing/receiving, recipe source history, legacy-unit review, canonical photo galleries, custom decorative catalogue headers/backgrounds and contained approved branding.

Semantic action/disabled colors now retain readable foregrounds. Accent foregrounds choose true white or black to cover bright red as well as the standard palette. Danger actions use a dark red surface with white text. Buttons/icons inherit currentColor. Shared rounded fields continue through the unit editors. All new system labels support English, Spanish, Traditional Chinese and Simplified Chinese; business values remain literal.

Only two new migrations follow the unchanged original 92. Local validation evidence is in BUILD_VALIDATION.json, FINAL_CHECK_RESULTS.json, DATABASE_TEST_RESULTS.json and docs/validation. Sample-data screen evidence is under docs/screenshots. Live deployment, real storage/Edge networking and physical installed-device acceptance remain pending; see KNOWN_ISSUES.md.

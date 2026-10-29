# Phase 5–6 implementation map

Baseline: RC28 (`2.0.0-rc.28`), copied into `work/rc29-source`; synced `sources/` remains read-only. Work is offline, with cached dependencies and local PostgreSQL-compatible tests. No deployment is authorized by this offline workflow.

| Area | Existing paths and prerequisite |
| --- | --- |
| Entry/auth/company | `src/main.tsx`, `src/App.tsx`, `src/lib/supabase.ts`; first-company bootstrap already exists |
| Navigation/layout | `src/Navigation.tsx`, `src/navigationModel.ts`, `src/appNavigation.ts`, `src/NavigationBoundary.tsx` |
| Setup | `src/OperationsSetup.tsx`, `src/OperationalWorkspace.tsx`; checklist exists, resumable seven-stage wizard incomplete |
| Help | `src/GuidedTutorial.tsx`, customer guide; no searchable contextual help library |
| Drafts/editors | `src/CatalogueContentEditors.tsx`, `src/CatalogueAbout.tsx`, `src/PublicationReview.tsx`; independent editors exist, durable unpublished drafts missing |
| Search | `src/UxShell.tsx`, `ux_search`/`ux_record` RPC chain; bounded server search exists, category discovery incomplete |
| Media | `src/App.tsx` gallery controls, `src/ImageCropper.tsx`, editor upload paths; section-specific management exists, central inventory incomplete |
| Pre-orders | `src/CataloguePreorders.tsx`, `src/CommercialOperations.tsx`, `src/PersistentOrderNotifications.tsx`; immutable request snapshots, deduplication, guarded decisions already exist |
| Discovery | `src/CustomerStorefront.tsx`, `src/CommercialCatalogue.tsx`, `src/commercialFilters.ts`; search/filter/detail/featured controls exist |
| Reliability | `src/checkoutRecovery.ts`, `complete_pos_checkout`, `src/UxShell.tsx`; idempotency and uncertain confirmation exist; draft recovery and honest general connection status need extension |
| Localization/theme | `src/i18n.tsx`, `src/translations.ts`, `src/sharedTheme.ts`, shared components; preserve business-authored text |
| Database | `supabase/migrations/` contains 101 migrations; add forward-only migrations, never edit applied history |
| Validation | `package.json`: TypeScript/Vite build, local integration and browser tests; no lint script configured |
| Deployment | `vercel.json`, `api/`, existing manual guides; preserve browser deployment, no native installers |

RC28 baseline: build passes; six legacy test groups have known fixture/environment failures (see RC28 report). They must be distinguished from new failures. The prior App.tsx JSX issue is not reproduced by RC28's successful build. Optional new analytics will be deferred until critical draft and transaction acceptance is complete.

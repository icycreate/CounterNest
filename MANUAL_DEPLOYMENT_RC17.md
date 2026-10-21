# Manual source deployment — RC17

**Not tested or build-validated. No deployment or live changes were performed.**

## Existing RC16 installation

1. Keep a backup of your existing source and database before your later deployment. Extract `CounterNest-POS-Order-Workflow-RC17.zip`; the enclosed folder is the project root.
2. In your own Supabase administration session, apply only `supabase/migrations/202610201200_persistent_preorder_notifications.sql` after the existing 94 migrations. Run the file as one transaction using the database owner/migration role. It adds snapshot and acknowledgement/presentation storage and extends existing functions. It does not rewrite historical requests or deduct inventory.
3. If the migration reports an unexpected intake definition, stop and reconcile your schema with the supplied RC16 baseline. Do not remove the migration's baseline guard or reset the database. Existing installations with all prior migrations must not rerun them. A new installation requires the ordered migration chain in MIGRATION_MANIFEST.json.
4. Upload/commit the source to your own GitHub repository when you choose. Include `src`, `public`, `api`, `supabase`, package/lock files and configuration. Keep private environment files, service-role keys, VAPID private keys, node_modules and dist out of Git.
5. In your Vercel project, use the extracted project root, the existing Vite configuration, `npm ci` installation, `npm run build` build command and `dist` output. Retain `vercel.json` and the `api` directory. Vercel will need to perform its normal deployment build; none was run during this work.
6. Retain your existing Supabase URL and public browser key. Configure Web Push as described in NOTIFICATION_SETUP.md. Server secrets belong only in server environment settings, never in `VITE_` variables.
7. Deploy the application after the database migration. New assets use the RC17 service-worker cache identifier. Device/browser notification permission and registration remain separate user actions after deployment.

## Operations and rollback

The request row, its unique alert event and device outbox rows commit together. Webhook delivery is a wake-up mechanism; the scheduled endpoint invocation is needed for retries/backlog processing. A webhook alone is not a reliable retry schedule.

The protected dispatcher leases up to 50 deliveries per call. Retain a schedule frequent enough for your volume and supported by your hosting plan. It retries transient failures up to five attempts within the existing one-day push window. Persistent in-app unread events do not expire with that push window. Expired subscriptions are removed by the dispatcher.

Rolling application source back to RC16 can leave the additive schema in place; old intake payloads remain compatible. Do not drop snapshot or acknowledgement tables to roll back the UI: they contain new operational records. No destructive rollback or database reset is included.

The source package is not a prebuilt deployment. No guarantees about successful compilation, transport delivery or device behavior are asserted because testing and build validation were explicitly excluded.

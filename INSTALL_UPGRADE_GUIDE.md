# RC7 upgrade from RC6

1. Keep the existing RC6 database and verified backup. This frontend/asset update adds no database migration. All 88 migrations and their hashes are unchanged. Older installations must first follow the RC6 purchasing upgrade guide.
2. Extract the source into the intended GitHub/Vercel project. Configure existing browser-safe environment variables; never put service-role credentials into the frontend.
3. Run npm install and npm run build. Deploy through the normal Vercel workflow.
4. Verify Login/session/dashboard startup and the controls in BOOT_UAT_CHECKLIST.md. The service-worker shell cache version is updated; allow a clean refresh before testing the new launch.
5. Existing installed PWA icons/native splash snapshots may be cached by the OS. Remove/reinstall a test PWA if its launcher still shows old artwork. Customer Catalogue manifest identity remains tenant-specific by its existing rules.
6. Roll back the frontend build if necessary; there are no RC7 database changes to reverse.

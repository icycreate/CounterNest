# GitHub / Vercel — RC11

Extract the ZIP and upload the contents of its CounterNest-POS-Customer-Experience-RC11 source folder to your intended repository. Include .gitignore, .env.example, package-lock.json, src, public, api, supabase, tests, docs and vercel.json. Keep real environment files, credentials, node_modules and dist out of the repository.

Follow INSTALL_UPGRADE_GUIDE.md and NOTIFICATION_SETUP.md. RC10 databases apply migration 92 only; fresh projects apply all 92. GitHub/Vercel frontend deployment does not apply SQL or configure the notification webhook/scheduler automatically. Existing Supabase Edge Functions retain their separate deployment.

Use build npm run build and output dist. No repository, remote commit or production deployment was created by this task.

# GitHub upload

Extract CounterNest-POS-Consolidated-RC3.zip. Open the folder containing package.json. Internal version 2.0.0-rc.3, build 2026-10-16-consolidated1. Use a private GitHub repository and review staged files before committing.

The included .gitignore excludes private environment files, dependencies, build output, local logs, editor/OS state and Vercel metadata. Track .env.example, package-lock.json, src, public, tests, docs and Supabase migrations/functions. Never commit service-role keys, customer exports, backups, passwords or private certificates.

Run npm install then npm run verify. Commit the reviewed source and push through your normal GitHub workflow, then import that repository into Vercel using VERCEL_DEPLOYMENT_GUIDE.md. Publishing the frontend does not deploy SQL or Edge Functions: follow SUPABASE_UPGRADE_GUIDE.md separately.

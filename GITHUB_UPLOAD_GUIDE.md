# Upload to private GitHub

Extract the ZIP and open a terminal inside CounterNest-POS-RC1-Update (the directory containing package.json). Create an empty **private** repository in GitHub. Do not initialize it with another README/license before the first push.

```sh
git init
git add .
git status --short
git commit -m "CounterNest POS RC1 update"
git branch -M main
git remote add origin <github-repository>
git push -u origin main
```

Review staged files before committing. .gitignore excludes .env/.env.local and other environment files, node_modules, dist, local logs, build metadata, editor/OS files, Vercel state and private certificate files. .env.example and package-lock.json are intentionally tracked. Never commit service-role credentials, production backup exports or customer data. If a key was committed, rotate it and remove it from repository history.

Connect only this repository to Vercel. Supabase migrations/Edge Functions are source files; importing into Vercel does not deploy them. Cloud upgrade instructions are in SUPABASE_UPGRADE_GUIDE.md.


This update source is CounterNest-POS-RC1-Update. The internal package version remains 2.0.0-rc.1; RELEASE_MANIFEST.json identifies build 2026-10-15-update1. Confirm your committed source/build before deploying.

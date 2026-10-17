# GitHub upload RC5

Extract the release ZIP and upload the contents of its source folder to the intended repository. Include .gitignore, .env.example, package-lock.json, src/, public/, api/, supabase/, tests/, docs/ and vercel.json. Do not upload .env, .env.local, node_modules, dist, database dumps or credentials.

Connect the repository to Vercel using VERCEL_DEPLOYMENT_GUIDE.md. RC4 databases need new migrations84–87 only. Deploy the new Supabase workspace-lifecycle function separately; deploying frontend source does not deploy SQL/Edge functions. No repository was created or pushed during package preparation.

Deploy the new workspace-lifecycle function and redeploy create-staff-account and reset-staff-password for owner-account protections after applying SQL84–87.

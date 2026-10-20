# Isolated visual preview

Run npm install, then npx vite --config tests/visual/vite.config.mjs. Open http://127.0.0.1:5196/catalogue-display?token=qa or /dashboard?qa_appearance=light. This explicit QA config replaces the Supabase client with local sample responses; never configure it as the production Vercel build. Ordinary npm run build uses the real unchanged database client.

Photos under qa/assets are inherited QA-only stock-photo fixtures from the unfinished RC15 work. They are not copied into production public assets or into business records. Before screenshots use RC14 with the same sample response file; after screenshots use RC15. No fake records are inserted into Supabase.

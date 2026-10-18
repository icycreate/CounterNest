# CounterNest POS — Customer Experience RC11

Version 2.0.0-rc.11 · 2026-10-18. Built from the actual System Style RC10 source.

Browser/Web Application → GitHub → Vercel → Supabase Cloud.

Implemented:

- Approved supplied artwork embedded unchanged in self-contained SVG viewports; regenerated PNG app icons with maskable padding. Custom tenant logo and favicon fallback behavior preserved.
- Customer appearance selector, persisted per catalogue/device and separate from administrator preferences. Dark prices and native controls inherit readable shared tokens.
- Enabled-only public contact cards with optional QR image, note, sorting and preferred method. International phone fields generate normalized WhatsApp links. No automatic copying of staff details.
- Removed the Translation manager. Product master names no longer use entity translation overrides. Only an explicit standard-category dictionary localizes known labels. Existing translation rows are retained for history/rollback.
- New device subscriptions, role-checked event polling, transactional request triggers, queue leases, duplicate tags, expired-subscription cleanup and private dispatcher credentials. Foreground notifications play three two-note rings by default; Repeat Sound off plays once.
- Public custom-cake request metadata participates in idempotency and acceptance creates the existing cake order type. No duplicate calendar or status chain.
- Independent settings sections retain their own unsaved-change state. Main Settings save does not save public contacts or device preferences.

Preserved: light authentication cards; bounded/reduced-motion boot; internal Back and dirty guards; reusable controls; historical delete/archive safety; original/cropped galleries and PDF images; text-only receipt lines; inventory source exclusions and receiving barcode overrides; original-source Calendar; phone normalization; backup, new-workspace restore and recovery-period deletion.

Deployment requires migration 92 and notification setup. Local tests do not certify external transport, OS sound, physical PWA installation, real storage/hardware or a production rollout.

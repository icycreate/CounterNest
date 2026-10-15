# Changelog — CounterNest POS v1.23.0 — Phase 34.0

- Replaced the active public-publication milestone with Internal Same-Network Deployment.
- Added `DEPLOY_COUNTERNEST_INTERNAL.ps1` for Local, LAN, and trusted HTTPS-LAN deployment modes.
- Added `VERIFY_COUNTERNEST_INTERNAL.ps1` with machine-readable Phase 34 deployment evidence.
- Added `REMOVE_COUNTERNEST_INTERNAL.ps1` for safe LAN/autostart rollback without touching business data.
- Expanded production configuration validation to accept approved internal LAN URLs on ports 4173/4174.
- Preserved Windows Private-profile + LocalSubnet-only firewall restrictions.
- Preserved Supabase Cloud as the backend; no Supabase migration is required for Phase 34.0.
- Updated package/release identity to v1.23.0 / Phase 34.0.
- Public hosting/domain/subscription/support/compliance phases are deferred for future use.

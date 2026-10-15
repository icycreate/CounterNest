# CounterNest POS Phase 32 — Internal Production Guide

Phase 32.0–32.9 prepares CounterNest for controlled internal use. It does not publish the POS to the public internet and does not automatically clear, restore, or rewrite business records.

## 32.0 Production cutover

1. Create and verify a fresh production backup before applying migration 42.
2. Apply all migrations to a separate test Supabase project first. Existing Phase 31.9 projects then apply `202608241400_phase32_internal_go_live.sql`.
3. Run `SETUP_COUNTERNEST_BROWSER_HOST.ps1 -ValidationOnly` against the test configuration.
4. Test the real catalog, tax, currency, timezone, staff roles, loyalty rules, recipes, inventory, receipt footer, and business identity.
5. If test records must be removed, take a backup and use a reviewed, shop-scoped SQL script in the Supabase SQL Editor. The POS intentionally has no Clear Production Data button.
6. Preserve the owner account, shop row, migration history, and required configuration. Never truncate `auth.users` or migration metadata.

## 32.1 Controlled manager day close

The administrator opens one Daily Cash record per business date. Cash sales, refunds, expenses, cash in, and cash out update its expected amount. At close:

- physically count the cash;
- enter a closing note;
- explain every non-zero variance;
- confirm the count and review;
- save the immutable closure event and reference;
- print or export the final report.

The closed record cannot be reopened or deleted from CounterNest. A prior-date open record blocks Phase 32 acceptance.

## 32.2 Security hardening

- Keep at least two named management custodians for the Supabase organization and recovery material.
- Enable MFA for the owner and production administrators; store a separate protected backup factor.
- Disable staff promptly when access is no longer needed.
- Never place a service-role key in `.env`, the app, a ZIP, screenshots, or staff instructions.
- The browser app uses only the Supabase URL and browser-safe publishable key. RLS and protected functions remain the enforcement boundary.
- Review administrator accounts quarterly and after every staffing change.

## 32.3 Backup and recovery

1. Export the CounterNest business backup and Supply Operations addendum.
2. Save each file with its SHA-256 checksum in encrypted offline storage.
3. Retain daily, weekly, and monthly copies according to management policy.
4. Test restoration only in a separate recovery Supabase project.
5. Record the recovery project, operator, backup hash, start/end time, result, exceptions, and management approval.
6. Never rehearse a restore over the production database.

## 32.4 Internal HTTPS and approved devices

Same-device `http://127.0.0.1:4173` is supported. Camera scanning from another phone/computer requires the secure LAN launcher:

1. Give the host computer a stable private-network hostname or reserved IP.
2. Issue a certificate covering that name/address through the business CA or a locally trusted authority.
3. Place the PEM files in `certs` using the names documented in `certs/README.md`.
4. Trust the issuing authority on every approved device.
5. Run `CONFIGURE_COUNTERNEST_HTTPS_FIREWALL.ps1` as Administrator on a Windows Private network.
6. Start `START_COUNTERNEST_HTTPS_LAN.ps1` and test sign-in, camera permission, barcode scan, checkout, and receipt display.
7. After acceptance, optionally run `REGISTER_COUNTERNEST_AUTOSTART.ps1 -Mode HttpsLan` under the dedicated Windows POS account. Use `-Remove` to undo it.

Do not port-forward 4173 or 4174. The HTTPS launcher is for trusted LocalSubnet devices only.

## 32.5 Reliability

- Test at the expected maximum product/customer volume.
- Confirm that checkout is blocked while offline and that reconnecting does not duplicate a sale.
- If a recovery screen appears, record its reference. Do not repeat payment until Sales confirms whether a receipt exists.
- Retain System Print as the receipt fallback until specific printer hardware is accepted.
- Review browser, Windows, and Supabase availability before each launch window.

## 32.6–32.9

Use `PHASE32_UAT_AND_TRAINING.md`, then complete every item in **Internal Go-Live**. Save drafts as evidence is collected. Only the named approving administrator should select **Approve Internal Go-Live** after all ten phases are complete and no required server/device check is failing.

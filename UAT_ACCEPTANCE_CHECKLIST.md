# RC13 acceptance checklist

Local checks are documented in UI_REGRESSION_CHECKLIST.md. Complete these on staging before rollout.

- [ ] Deploy normal source to Vercel with the existing Supabase variables; verify authenticated deep-link refresh and public customer token links.
- [ ] Repeat Light/Dark/System while changing the OS preference, including installed PWA cold start.
- [ ] On physical iPhone, Android and tablet, inspect all primary/destructive controls, menus, native pickers, prices and disabled/loading labels.
- [ ] Repeat all major modules named in ACCESSIBILITY_AUDIT.md with real representative records, role permissions and errors.
- [ ] Verify keyboard tab/focus, zoom 200%, screen reader names and custom business backgrounds.
- [ ] Repeat English, Español, 繁體中文 and 简体中文 with long real product/business names.
- [ ] Verify full wordmark is contained; tiny square slots use icon artwork.
- [ ] Perform approved sale, refund/void, PO/receiving, preorder and backup/restore staging workflows and reconcile data.

Acceptance rule: visible controls, labels, values, prices and totals must be immediately readable. Record device/browser/version, screenshot, measured pair and pass/fail for any finding. RC13 requires no new SQL when upgrading RC12.

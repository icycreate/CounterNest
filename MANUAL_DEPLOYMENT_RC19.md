# Manual update and notification configuration — RC19

This document describes future manual work only. The delivered source is not tested, build-validated, configured against live services or deployed. No credentials were created and no messages were sent.

## Local source and migration order

Extract the complete RC19 ZIP. Retain a backup of your existing source and database through your established process before a future deployment. Preserve existing environment settings privately. Do not reset/reseed Supabase or reapply historical migrations.

An RC18 database has 96 migrations. Apply only `supabase/migrations/202610231200_customer_restore_whatsapp_alerts.sql` as migration 97. Older installations must first apply their missing migrations in MIGRATION_MANIFEST.json order, including RC17 and RC18. New installations use the full existing setup and all 97 migrations. This migration is intended to run once through migration tracking. No historical migration was edited.

The migration adds two private WhatsApp tables and five functions (restore, customer history, preference read/save, delivery leasing). It does not update historical business records, seed recipients, copy phone numbers, change prices or stock, or send messages. Existing RLS and authorization remain; direct customer/staff access to WhatsApp storage is revoked. The existing activation audit trigger handles restoration. No new Edge Function is required; preserve existing baseline Edge Functions.

Apply the migration before releasing the new UI/server code. Without it, archived direct reads use the existing table policies, but Restore, expanded history and WhatsApp preferences are unavailable. The UI surfaces backend errors rather than fabricating success.

## GitHub / Vercel deployment, when separately authorized

Upload/commit the complete extracted source to your intended existing repository using its normal access controls. Keep node_modules, dist, local .env files, tokens and private signing keys out of the repository. Retain the existing package lock, Vite project setup and vercel.json routing. Root is the folder containing package.json; normal hosting output is dist. Dependency installation and the existing hosting build script are future deployment work, not actions taken here. This source has not been checked with the compiler.

Deploy the frontend, existing API endpoints, new `api/whatsapp-order-alerts.js`, and updated `public/sw.js` together. Keep HTTPS and the existing PWA manifest/root service-worker scope. Existing Web Push dispatch, VAPID variables, customer webhook and scheduler described in MANUAL_DEPLOYMENT_RC18.md remain required and independent.

## WhatsApp Cloud API preparation

Use an official WhatsApp Business Platform Cloud API business account, registered sender phone-number ID, suitable server token and approved templates. Complete recipient opt-in outside CounterNest as appropriate, then an administrator must explicitly confirm consent in CounterNest Settings → Notifications → WhatsApp Order Alerts. The private recipient field starts empty. Consent is required whenever enabled preferences are saved. Disabling remains possible without new consent. Changing preferences cancels pending older-revision jobs; only future events after the new consent timestamp are eligible. No historical order backfill is sent.

Configure server environment variables (none are browser/VITE secrets):

| Variable | Meaning |
| --- | --- |
| WHATSAPP_ACCESS_TOKEN | Private Meta token authorized for the configured sender |
| WHATSAPP_PHONE_NUMBER_ID | Numeric Cloud API sender phone-number ID |
| WHATSAPP_GRAPH_VERSION | Supported Graph API version selected during your manual Meta setup, e.g. the shape vNN.0; do not use the placeholder literally |
| WHATSAPP_ORDER_TEMPLATES | JSON language map described below |
| CRON_SECRET | Secret authorizing server webhook/scheduler calls |
| SUPABASE_SERVICE_ROLE_KEY | Server-only existing Supabase key |
| VITE_SUPABASE_URL | Existing project URL used by the dispatcher |

Retain VITE_SUPABASE_PUBLISHABLE_KEY for the browser. Existing Web Push retains VITE_WEB_PUSH_PUBLIC_KEY in the browser and WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY, WEB_PUSH_SUBJECT on the server. Never expose WHATSAPP_ACCESS_TOKEN, the service-role key or private VAPID key in a VITE variable.

`WHATSAPP_ORDER_TEMPLATES` is a JSON object with exactly the supported UI language entries. Each contains your actual approved template name and its Meta language code. Example configuration structure (replace names/codes to match your approved templates):

```json
{
  "en": {"name":"counternest_order_alert","code":"en_US"},
  "es": {"name":"counternest_order_alert","code":"es"},
  "zh-TW": {"name":"counternest_order_alert","code":"zh_TW"},
  "zh-CN": {"name":"counternest_order_alert","code":"zh_CN"}
}
```

All four entries must be configured before leasing sends. Have Meta approve the exact template for each language. The integration sends a template BODY with six positional text parameters, in this order:

1. Business name.
2. Order number including #.
3. Customer name/phone/contact/preferred method when the administrator enabled customer contact; otherwise an em dash.
4. Quantity, item name and variants/options when summary is enabled; otherwise an em dash.
5. Snapshot currency and estimated total when summary is enabled; otherwise an em dash.
6. Customer notes when summary is enabled; otherwise an em dash.

Use fixed localized template labels around these six parameters. Suggested English body:

```text
New CounterNest Order
Business: {{1}}
Order: {{2}}
Customer contact: {{3}}
Items: {{4}}
Estimated total: {{5}}
Notes: {{6}}
Open CounterNest to review this request.
```

Supply realistic sample parameter values through your own Meta template process. The application does not create or approve templates. Names and content must match Meta approval, recipient consent and your account's supported use case. No unapproved free-form message fallback exists. Templates contain no action to accept/decline orders; staff must use authenticated CounterNest screens. This version does not configure URL buttons or include private tracking tokens. Each variable is limited to 450 characters with an ellipsis for longer content. Full details remain in the protected POS. Notes may themselves contain personal information; enabling order summary includes notes.

## Server triggering and retry policy

Keep existing Web Push webhooks and schedules unchanged. Add a separate Database Webhook on INSERT into existing `public.order_alert_events`:

- POST `https://YOUR-DEPLOYMENT/api/whatsapp-order-alerts`.
- Authorization: `Bearer YOUR_CRON_SECRET`.
- Content-Type: `application/json`.

Also add a scheduler invoking this endpoint with GET or POST and the same Authorization header, typically once per minute or according to hosting limits. No hosted scheduler is automatically created by this source. The dispatcher ignores client body data, derives deliveries from committed events, rechecks workspace/consenting administrator eligibility and preferences, and keeps WhatsApp independent from order creation and Web Push. Up to 20 deliveries are leased per invocation. Meta calls use the fixed graph.facebook.com host and the server-configured version/sender.

Delivery states: pending, sending, accepted, failed, unknown, cancelled. Accepted means Meta returned a message ID, **not delivered or read**. This version does not implement delivery/read-status callbacks. Database records retain attempts, provider ID and a redacted error category. No access token or raw provider response is stored in errors.

Only explicit rate-limit rejections (HTTP 429) are retried automatically, after five minutes, with a maximum of five attempts within one day of the event. Network timeouts, server errors and expired in-flight leases become unknown because Meta may already have accepted the message. They are not blindly resent. Definite other provider rejections become failed. Operators must review unknown/failed states through authorized backend administration after setup; do not reset unknown rows without independently determining the outcome. Meta provides no general idempotency guarantee for this send path, so this design favors avoiding duplicate external messages over automatic retries of uncertain sends. A saved order remains valid if dispatch fails.

Concurrent requests are leased with database locks and unique event IDs. Preference revisions and active administrator consent are checked before sends; a message already in flight cannot be recalled after disabling. The integration is a single configured sender per deployment, with isolated workspace preferences/recipients; separate sender credentials per tenant are not implemented. Use only workspaces legitimately covered by that sender/account.

## Remaining limitations

- Nothing is live until migration, hosting, Meta credentials/template approval, webhook/scheduler and administrator/recipient consent are completed.
- Existing Web Push/customer pickup notifications retain their own device permission and backend requirements; WhatsApp does not replace them.
- Phone validation uses the existing locally available libphonenumber metadata. Its version was not supplied, so recent numbering-plan changes may require a later authorized dependency refresh. It cannot verify ownership, reachability or WhatsApp enrollment. No online lookup occurs.
- LINE/WeChat names are not presumed launchable. Details/QR are shown when no configured HTTPS destination exists. App icons are composed from the existing icon system with persistent text labels.
- Archived history access follows existing customer-history permissions; the new loyalty projection is additionally restricted to admin/manager/cashier. Staff whose existing policy blocks customer history do not receive expanded access.
- Historical QA/test/build files remain for provenance only. They do not validate RC19. No test screenshots or new testing reports were generated.

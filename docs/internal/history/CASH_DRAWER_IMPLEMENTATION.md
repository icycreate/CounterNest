# Management Cash Drawer — v0.8.1

## Included workflow

Management opens a drawer at the start of a shift, enters the cash already present, and may record extra cash in or cash out with a required reason. Cash sales and cash refunds are attached automatically while a drawer is open. At closing, management enters the counted cash and the system saves the expected balance and variance.

## Permissions and audit

- The existing `admin` role is the management role; employees cannot see the Cash Drawer navigation or read drawer records.
- All mutations use security-definer Supabase RPCs that re-check authentication, shop membership, and administrator status.
- Drawer tables use RLS for shop isolation and have no direct client write policies.
- Transactions are append-only from the client perspective and record actor, timestamp, amount, type, reason, and sale/refund references.
- Only one drawer may be open per shop. Closing records are retained and cannot be reopened through the app.

## Apply the database migration

Run `supabase/migrations/202608180800_cash_drawer.sql` in the Supabase SQL Editor after the existing migrations. Back up the database first and apply it to a test project before production.

## Notes

- Existing checkout remains valid even when no drawer is open. This preserves current POS behavior; cash activity is tracked only while a session is open.
- Card and QR sales never affect the cash drawer.
- Physical drawer opening remains part of hardware integration; this feature manages the accountable cash balance.



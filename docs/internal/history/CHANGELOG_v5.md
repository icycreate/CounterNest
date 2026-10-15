# v5 — Account Signup & Business Onboarding

## Changed

- Replaced the branded login card with a clean, neutral login stage containing no business logo.
- Added **Sign up** for new business owners.
- Signup collects owner name, email, password, and password confirmation.
- Added an email-confirmation-aware flow for Supabase Auth.
- Removed automatic `bootstrap_shop('CHUBBYLU BAKES', ...)` behavior from the frontend.
- Users who authenticate without an existing `staff_profiles` record are now routed to first-time business setup instead of receiving a default ChubbyLu shop.

## First-time business setup

The required setup screen collects:

- Business name
- Business phone number
- Business address
- Optional business logo

The logo can be resized before upload and is normalized to 512 × 512 PNG. After setup, the user enters the normal POS dashboard.

## Database

Added `bootstrap_business(...)`, an authenticated security-definer RPC that creates:

- the new shop,
- the account owner as Admin,
- the loyalty program,
- the default bakery categories.

The function is safe to retry after a logo-upload failure and reuses the existing owner shop instead of creating duplicates.

## Multi-business cleanup

Real Supabase shops with no products/customers/rewards/sales now render as empty instead of falling back to ChubbyLu demo data.

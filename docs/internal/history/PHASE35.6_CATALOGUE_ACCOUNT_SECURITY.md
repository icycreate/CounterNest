# Phase 35.6 — Catalogue & Account Security

Release: **CounterNest POS v1.40.0**  
Database migration: **62 — `202610121000_phase35_6_catalogue_account_security.sql`**

## Catalogue management

Phase 35.6 adds an administrator-only **Catalogue** page. It does not create a second product database. The existing Products record remains authoritative for product name, barcode, category, selling price, stock, active state, image and food icon. Catalogue stores presentation-only fields: customer description, visible/hidden, featured, manual sold-out, and display order.

A manual sold-out flag prevents customer selection without changing physical inventory. Product stock and active state remain authoritative at checkout.

## Catalogue PDF / print export

Administrators can export customer-visible catalogue data using the browser print workflow and choose **Save as PDF**. Supported scopes include all customer-visible products, available products, featured products, one category, or individually selected products. Two layouts are provided: visual Customer Catalogue and Compact Price List.

Export options include A4/Letter, portrait/landscape, business logo, product photos, description, price, availability, barcode/product code and protected customer-catalogue QR code. The export uses current server-loaded catalogue data and does not modify products or prices.

## Password security UX

Password inputs remain masked by default and provide show/hide controls on login, staff invitation/signup, direct staff creation, initial password replacement, self-service password change, and administrator reset forms.

Direct staff creation and reset require **Password + Confirm Password**. Initial password replacement and normal password change require **New Password + Confirm New Password**. Matching confirmation is checked in the UI and again by the protected Edge Function where applicable.

Active staff can change their own password from **Settings → Account Password** by supplying the current password, a new password and confirmation. The server re-authenticates the current password before updating Supabase Auth.

Administrators can reset another active staff member to a generated or entered temporary password. The staff profile is marked `must_change_password=true`; the staff member must replace the temporary password on next sign-in. Password values are never written to CounterNest audit records.

## Required Edge Functions

Deploy/update these functions from this release:

- `create-staff-account`
- `change-initial-password`
- `change-password` **new**
- `reset-staff-password` **new**

Only service-role secrets belong in the Supabase Edge Function environment. Never place a service-role key in the frontend `.env`.

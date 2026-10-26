# RC24 phone recognition metadata

The server validation rules in `202610251000_customer_recognition.sql` were generated offline from the existing `src/vendor/libphonenumber.js` metadata and the supported region list in `src/phone.ts`. No number lookups or test cases were executed. No package was downloaded.

The generated private table contains calling codes, national-number patterns and possible lengths for fixed line, mobile, toll-free, premium-rate, shared-cost, VoIP, personal, pager, UAN and voicemail descriptors where the bundled region metadata provides them. PostgreSQL compares the complete international calling code plus national number; it never matches a suffix. Formatting uses the existing `normalize_international_phone` utility, guarded to reject ambiguous punctuation/prefixes. Historical national-only numbers remain unmodified and require authorized manual review.

The UI continues to use PhoneInput and the existing normalizePhone/isValidPhone utilities. Formatting/numbering-plan validity is not identity verification. The supplied metadata has no version manifest and may predate numbering-plan changes; see THIRD_PARTY_PHONE_NOTICE.md and the bundled Apache license. Non-geographic/service numbers outside the supported country-region list may require manual staff review rather than exact-match recognition. No claim of live validity, ownership, reachability or OTP verification is made. A future metadata refresh must update browser and server rules together through a new migration, not edit an applied migration.

No tests, PostgreSQL execution, regex compatibility checks or build validation were performed for this update.

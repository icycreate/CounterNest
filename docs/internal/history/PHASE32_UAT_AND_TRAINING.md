# Phase 32.6–32.7 — UAT and Staff Training

Run user acceptance testing in the test Supabase project with launch-like devices, network, roles, products, and settings. Record operator, time, expected result, actual result, evidence reference, and pass/fail for every test.

## Administrator UAT

- Sign in, password change, disabled-account denial, and owner/administrator MFA.
- Start Daily Cash, cash in/out, cash expense, cash sale, cash refund, counted close, variance explanation, closure reference, report CSV, and print/PDF.
- Card and QR sale recording without claiming external payment reversal.
- Product/category/image/emoji management, stock adjustment, receiving, recipe costing, production, ingredient lots, finished batches, waste, and purchasing.
- Customer lookup by Card ID, name, and phone; loyalty earning, manual point grant, reward redemption, and reversal after refund/void.
- Receipt QR/barcode card printing, product camera scan over approved HTTPS, and manual barcode entry fallback.
- Manager PIN approval for refunds and voids, including required reason and audit history.
- Finished-product recall, affected receipt outcome, quarantine disposal, and recall-case closure.
- Business backup, checksum verification, Supply Operations addendum, and recovery-environment validation.
- Phase 32 operational acceptance and Internal Go-Live draft/approval behavior.

## Employee UAT

- First-login opening-cash declaration and required password change.
- Product search, category selection, barcode/camera scan, quantity change, customer selection, reward selection, and tender.
- Cash received/change calculation and receipt confirmation.
- Employee denial from administrator pages and management-only operations.
- Offline banner and blocked checkout behavior.

## Training checklist

Each named staff member must demonstrate:

1. Secure sign-in and sign-out.
2. First-login daily cash declaration.
3. Cash, card, and QR sale workflows.
4. Cash counting and change verification.
5. Customer privacy and loyalty-card handling.
6. Barcode/camera fallback and manual product lookup.
7. Calling a manager for refunds, voids, cash changes, and suspicious activity.
8. Recognizing offline state and avoiding duplicate payment.
9. Receipt reprint procedure.
10. Incident escalation and end-of-shift handover.

Training evidence should contain staff name, trainer, date, device, result, remediation, and both acknowledgments. Do not store passwords, PINs, cardholder payment information, or MFA secrets in training evidence.

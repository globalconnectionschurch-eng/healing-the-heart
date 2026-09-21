# Giving System Requirements

## Public giving flow

- The Give page must offer a standalone giving flow separate from class registration.
- Giving requires full name, email address, and phone number.
- The system should match the giver to an existing attendee/student record when possible.
- If no match is found, the admin workflow must support reviewing or creating the attendee record before final association.

## Giving records

Each giving transaction must record:

- Internal transaction ID
- Provider transaction ID when available
- Attendee/student ID when matched
- Full name, email, and phone captured at submission
- Date and time
- Amount
- Payment method (online card, in-person debit, in-person credit, cash, cheque, other)
- Source (website or manual admin entry)
- Purpose/designation
- Status (pending, paid, failed, refunded, voided, or entered)
- Notes and the admin who entered or changed the record

## Attendee Directory

- Add a Giving sub-tab to each attendee profile.
- Show individual giving history with date, time, amount, method, source, purpose, transaction ID, and status.
- Show cumulative giving totals, with filtering by date range and status.

## Manual terminal entry

- Admins must be able to manually enter transactions made through church Moneris Go terminals because not every terminal transaction belongs to Healing the Heart.
- Manual entry must require selecting or matching an attendee, amount, date/time, payment method, and purpose.
- Admins should be able to enter the terminal transaction/reference ID and notes.
- Manual records must be clearly marked as manually entered and must not be confused with automatically verified online payments.
- The system should prevent accidental duplicate entry where the same provider/reference ID is already recorded.

## Security and accounting

- Never store full card numbers, CVV, or sensitive payment credentials.
- Restrict manual entry and giving-history access to authenticated admins.
- Preserve an audit trail for edits, status changes, and deletions.

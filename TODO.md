# Chopra Capital to-do

## Integrations

- [ ] Fetch the USD/INR exchange rate from a real-time API for bank and cash withdrawal estimates.
  - Fetch the rate server-side and cache it briefly to avoid exposing credentials or hitting provider limits.
  - Show the rate source and quote timestamp to the investor.
  - Use the latest stored rate as a fallback when the provider is unavailable.
  - Keep the displayed INR explicitly marked as an estimate.
  - Continue recording the actual INR received after USD conversion as the final payout value.

## Security

- [ ] Add email confirmation for every withdrawal request after the production domain and email provider are configured.
  - Keep a new request in `awaiting confirmation` until the investor approves it from their registered email.
  - Send a unique, single-use confirmation link that expires after 15 minutes.
  - Bind the confirmation to the withdrawal amount, method, and payout destination.
  - Show those transaction details on the confirmation screen before final approval.
  - Do not show or allow the admin to approve/process an unconfirmed withdrawal.
  - Invalidate the previous link when a request is edited and send a replacement link.
  - Allow the investor to cancel an unconfirmed request.
  - Rate-limit confirmation email resends and record confirmation time for the audit trail.
  - Configure the production sender domain, provider credentials, sender address, and public application URL.
  - Fail safely if email delivery is unavailable: do not activate the withdrawal request.



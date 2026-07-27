# Chopra Capital

A Next.js investor portal with KYC, deposits, withdrawals, support tickets, manual pooled-account reporting, investor unit/NAV accounting, profit-share settlements and a secured administrator workspace.

## Local setup

1. Copy `.env.example` to `.env` and set every secret/company payment value.
2. Set `ADMIN_PASSWORD` to a unique password of at least 12 characters. The built-in admin email defaults to `admin@chopracapital.com` and can be changed with `ADMIN_EMAIL`.
3. Install dependencies with `npm ci`.
4. Apply database migrations with `npm run db:deploy`.
5. Build with `npm run build`.
6. Run production with `npm start`.

No user or administrator accounts are seeded. The built-in administrator is created on its first valid sign-in from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. If 2FA is enabled on that account, the TOTP challenge is required after the password.

## Manual trading account

The administrator maintains the central trading balance and equity from the admin overview. Every snapshot or adjustment records its reason, signed amount, before/after balance, before/after equity, administrator and timestamp.

Supported reasons include verified user deposits, trading profit, trading loss, server fees, admin profit share, user withdrawals and other corrections. Invested deposit batches and broker withdrawal batches update the central account automatically. NAV is calculated as trading equity divided by issued pool units.

## Account recovery

Until email delivery is configured, the sign-in page directs investors to the administrator WhatsApp number `+91 81233 20128`. An administrator can set a temporary password from the investor’s full record.

## Deployment updates

Copy the project source (excluding `.next`, `node_modules`, local `.env`, and local database files) or pull the latest Git revision on the server. Then run:

```bash
npm ci
npm run db:deploy
npm run build
sudo systemctl restart chopra-capital
```

Keep `.env` and the production SQLite database on the server and back them up before migrations.
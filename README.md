# Chopra Capital

A Next.js investor portal for KYC, deposits, withdrawals, support tickets, pooled-account reporting, investor unit/NAV accounting, and a secured administrator workspace.

## Local setup

1. Copy `.env.example` to `.env` and replace every placeholder.
2. Install the locked dependencies with `npm ci`.
3. Apply migrations with `npm run db:deploy`.
4. Build with `npm run build`.
5. Start with `npm start`.

No demo user or administrator accounts are seeded. The built-in administrator is created on its first valid sign-in using `ADMIN_EMAIL` and `ADMIN_PASSWORD`. If that account has 2FA enabled, its TOTP challenge is mandatory.

## Accounting model

The administrator records trading profit, trading loss, server/operating fees, company profit share, and other audited increases or decreases. Verified deposits and processed withdrawals use their own dedicated workflows and are not entered as manual adjustments. Balance is the single source of truth; investor value is derived from issued units and NAV.

## Production environment

Use Node.js 20.19.0 or newer (Node.js 24 LTS is suitable). Create the real production environment from `.env.production.example`. At minimum:

- use a long random `AUTH_SECRET`;
- use a unique high-entropy `ADMIN_PASSWORD`;
- use an HTTPS `NEXT_PUBLIC_APP_URL`;
- keep one stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for all processes serving the same build;
- set a new `NEXT_DEPLOYMENT_ID` for every deployment;
- keep `WITHDRAWAL_WINDOW_TEST_MODE=false`;
- configure company deposit destinations and the public read-only MT5 investor credentials.

Run `npm run check:production` before a production build. The check reports missing names but never prints secret values.

## Production deployment

This project currently uses SQLite and local private uploads. Run exactly one application instance and keep the database and `uploads/` directory on persistent storage. Put Nginx or another reverse proxy in front of Next.js for HTTPS, request-size enforcement, authentication rate limits, and access logging.

A safe update sequence on Ubuntu is:

```bash
git pull --ff-only
npm ci
sudo systemctl stop chopra-capital
sudo cp /var/lib/chopra-capital/production.db /var/backups/chopra-capital/production-$(date +%F-%H%M%S).db
npm run db:deploy
export NEXT_DEPLOYMENT_ID="$(git rev-parse --short HEAD)-$(date +%s)"
npm run build:production
sudo systemctl start chopra-capital
sudo systemctl status chopra-capital --no-pager
curl -I https://your-domain.example
```

`NEXT_DEPLOYMENT_ID` prevents an older browser tab from submitting stale Server Action identifiers after deployment. Stopping the service before migrations/building also prevents the running process from reading a changing SQLite schema or a partially replaced `.next` directory.

Back up both the SQLite database and `uploads/` directory before every migration. Test that backups can be restored. Never copy `.env`, the database, or private uploads into Git.

## Verification commands

- `npm run lint` — static code checks
- `npx prisma validate` — schema validation
- `npx prisma migrate status` — migration status
- `npm run build` — normal production compilation
- `npm run check:production` — production environment guardrails
- `npm run build:production` — guarded production build

## Account recovery

Investors with 2FA can reset their password using their authenticator. Until email delivery is configured, investors without 2FA are redirected to the administrator WhatsApp recovery channel. Administrators can also set a temporary investor password from the investor record.
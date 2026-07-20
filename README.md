# Chopra Capital — managed gold-fund investor platform

A full-stack web platform for a Dubai-based specialist gold fund: public marketing
site, investor app and admin console. Investors deposit USDT, allocate to a pooled
trading account, watch performance live via MT5, and withdraw weekly.

> **Important.** Running a fund that pools investor money is a **licensed
> activity** in most jurisdictions (UAE: DFSA/SCA; crypto custody: VARA). This
> software is a tool — speak to a financial-services lawyer before going live.
> Never advertise "risk-free" or guaranteed returns.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first `@theme` tokens) · **framer-motion** · **Recharts** · **lucide-react**
- **Prisma 6** + SQLite in dev (client generated to `src/generated/prisma`)
- Custom auth: **bcryptjs** + **jose** JWT (httpOnly cookie `gf_session`) + **TOTP 2FA**
- All money values are Prisma **Decimal** — converted to numbers only at the display edge (`src/lib/money.ts`)

## Getting started

```bash
npm install
npm run db:migrate     # creates prisma/dev.db and generates the client
npm run db:seed        # demo investor + admin + consistent demo history
npm run dev            # http://localhost:3000
```

Seeded accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@chopracapital.com` | `Admin123!` |
| Investor | `demo@chopracapital.com` | `Demo1234!` |

## How the pool works (units / NAV)

1. **Deposit** — investor sends USDT, admin confirms → credited to the wallet's
   `queued` balance (`DEPOSIT` ledger entry).
2. **Weekly invest run** (admin, Sunday) — every queued balance converts into
   **pool units** at the current NAV (`INVEST` entry records units + NAV used).
3. **NAV** = live MT5 equity ÷ total pool units. The bridge pushes equity every
   few seconds; each push upserts a daily `NavSnapshot`, so charts use real
   history only (interpolated between snapshots, never fabricated).
4. **Withdraw** — requested Saturday, processed Sunday: queued cash is drawn
   first, then units are redeemed at the live NAV (`WITHDRAWAL` + `FEE` entries).

Every balance mutation goes through `src/lib/wallet.ts` inside a transaction
that also writes append-only `LedgerEntry` rows — the books always balance.

## MT5 bridge

```bash
pip install MetaTrader5 requests
set MT5_LOGIN=5012345
set MT5_PASSWORD=read-only-investor-password   # NEVER the master password
set MT5_SERVER=YourBroker-Live
set INGEST_URL=https://yourdomain.com/api/mt5/ingest
set MT5_INGEST_TOKEN=<same as website .env>
python scripts/mt5_bridge.py
```
### Linux VPS / Wine terminal

The official `MetaTrader5` Python package ships Windows wheels, so use the
native MQL5 bridge when MT5 itself is running under Wine on Linux:

1. Copy `scripts/ChopraMt5Bridge.mq5` into the terminal's `MQL5/Experts/`
   folder and compile it in MetaEditor.
2. Attach it to any chart, then set the HTTPS ingest URL and the same
   `MT5_INGEST_TOKEN` configured on the website.
3. In MT5, add the site origin (for example `https://test.yourdomain.com`) to
   **Tools → Options → Expert Advisors → Allow WebRequest for listed URL**.

The Expert Advisor only reads account/trade data and pushes it to the website;
it does not submit orders.

- `POST /api/mt5/ingest` — bridge → platform (X-MT5-Token header)
- `GET /api/mt5/summary` — latest account snapshot + trades (signed-in users)
- `GET /api/portfolio?from=&to=` — investor value series (polled every 15s)

## Environment (`.env`)

| Key | Purpose |
|---|---|
| `DATABASE_URL` | `file:./dev.db` locally; Postgres URL in production |
| `AUTH_SECRET` | JWT signing secret — **change in production** (32+ chars) |
| `NEXT_PUBLIC_APP_NAME` | "Chopra Capital" |
| `MT5_INGEST_TOKEN` | shared secret for the bridge |
| `MT5_SERVER` / `MT5_LOGIN` / `MT5_INVESTOR_PASSWORD` | read-only investor access shown to investors |
| `MT5_WEBTERMINAL_URL` | MT5 web terminal link |
| `DEPOSIT_ADDRESS_TRC20/ERC20/BEP20` | company USDT receiving addresses |

## Project layout

```
src/
  proxy.ts            route protection (Next 16 proxy convention)
  app/
    page.tsx          marketing site (hero, strategy, terms, FAQ)
    (auth)/           signup, signin, 2FA
    app/              investor app: dashboard, deposit, withdraw, tickets, profile
    admin/            console: overview, deposits, withdrawals, KYC, tickets, investors
    legal/            terms, privacy, risk disclosure
    api/              portfolio, mt5 ingest/summary, admin kyc-file
  components/         ui primitives, landing, app shell, admin shell
  lib/                auth, totp, money, nav, wallet (accounting), portfolio
prisma/               schema, migrations, seed.mjs
scripts/              mt5_bridge.py
uploads/              KYC documents (outside the public web root)
```

## Production notes

- Switch `prisma/schema.prisma` provider to `postgresql` and set `DATABASE_URL`.
- Set a strong `AUTH_SECRET`, real deposit addresses and MT5 investor credentials.
- KYC uploads write to `uploads/` on disk — move to S3/R2 for serverless hosts.
- Compliance guardrails are deliberate: the 1–4%/month figure is always framed
  as an objective, "capital at risk" appears on landing/signup/withdraw, KYC is
  required before deposits, and only the read-only MT5 investor password is
  ever displayed.

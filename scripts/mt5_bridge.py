"""Chopra Capital MT5 bridge.

Runs next to a Windows MetaTrader 5 terminal and pushes the account snapshot
plus open/recent trades to the platform's ingest endpoint every few seconds.

Use a READ-ONLY (investor) password — this script never trades.

    pip install MetaTrader5 requests

    set MT5_LOGIN=5012345
    set MT5_PASSWORD=read-only-investor-password
    set MT5_SERVER=YourBroker-Live
    set INGEST_URL=https://yourdomain.com/api/mt5/ingest
    set MT5_INGEST_TOKEN=<same value as the website .env>

    python scripts/mt5_bridge.py
"""

import os
import time
from datetime import datetime, timedelta, timezone

import MetaTrader5 as mt5
import requests

LOGIN = int(os.environ["MT5_LOGIN"])
PASSWORD = os.environ["MT5_PASSWORD"]
SERVER = os.environ["MT5_SERVER"]
INGEST_URL = os.environ.get("INGEST_URL", "http://localhost:3000/api/mt5/ingest")
TOKEN = os.environ["MT5_INGEST_TOKEN"]
INTERVAL_SECONDS = int(os.environ.get("INTERVAL_SECONDS", "5"))
CLOSED_LOOKBACK_DAYS = int(os.environ.get("CLOSED_LOOKBACK_DAYS", "30"))


def iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def order_type_name(t: int) -> str:
    return "BUY" if t in (mt5.ORDER_TYPE_BUY, mt5.POSITION_TYPE_BUY) else "SELL"


def collect_payload() -> dict:
    info = mt5.account_info()
    if info is None:
        raise RuntimeError(f"account_info failed: {mt5.last_error()}")

    trades = []

    for p in mt5.positions_get() or []:
        trades.append({
            "ticket": str(p.ticket),
            "symbol": p.symbol,
            "type": order_type_name(p.type),
            "volume": p.volume,
            "openPrice": p.price_open,
            "closePrice": None,
            "profit": p.profit,
            "swap": p.swap,
            "commission": 0.0,
            "status": "OPEN",
            "openTime": iso(p.time),
            "closeTime": None,
        })

    since = datetime.now(timezone.utc) - timedelta(days=CLOSED_LOOKBACK_DAYS)
    deals = mt5.history_deals_get(since, datetime.now(timezone.utc)) or []
    for d in deals:
        if d.entry != mt5.DEAL_ENTRY_OUT:
            continue  # report closing deals only
        trades.append({
            "ticket": f"deal-{d.ticket}",
            "symbol": d.symbol,
            "type": order_type_name(d.type),
            "volume": d.volume,
            "openPrice": d.price,
            "closePrice": d.price,
            "profit": d.profit,
            "swap": d.swap,
            "commission": d.commission,
            "status": "CLOSED",
            "openTime": iso(d.time),
            "closeTime": iso(d.time),
        })

    return {
        "account": {
            "login": str(info.login),
            "name": info.name,
            "server": info.server,
            "currency": info.currency,
            "balance": info.balance,
            "equity": info.equity,
            "margin": info.margin,
            "freeMargin": info.margin_free,
        },
        "trades": trades,
    }


def main() -> None:
    if not mt5.initialize(login=LOGIN, password=PASSWORD, server=SERVER):
        raise SystemExit(f"MT5 initialize failed: {mt5.last_error()}")
    print(f"Connected to {SERVER} as {LOGIN} (read-only). Pushing to {INGEST_URL} every {INTERVAL_SECONDS}s.")

    while True:
        try:
            payload = collect_payload()
            r = requests.post(
                INGEST_URL,
                json=payload,
                headers={"X-MT5-Token": TOKEN},
                timeout=15,
            )
            print(f"{datetime.now():%H:%M:%S} equity={payload['account']['equity']:.2f} "
                  f"trades={len(payload['trades'])} -> {r.status_code}")
        except Exception as exc:  # keep the bridge alive through hiccups
            print(f"{datetime.now():%H:%M:%S} push failed: {exc}")
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()

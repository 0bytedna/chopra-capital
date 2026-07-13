// Central place for env-derived config. Server-only values must never be
// imported into client components (only NEXT_PUBLIC_* are safe there).

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Chopra Capital";

export const MIN_DEPOSIT_USDT = 2000;

export const NETWORKS = ["TRC20", "ERC20", "BEP20"] as const;
export type Network = (typeof NETWORKS)[number];

export function depositAddress(network: Network): string {
  switch (network) {
    case "TRC20":
      return process.env.DEPOSIT_ADDRESS_TRC20 ?? "";
    case "ERC20":
      return process.env.DEPOSIT_ADDRESS_ERC20 ?? "";
    case "BEP20":
      return process.env.DEPOSIT_ADDRESS_BEP20 ?? "";
  }
}

export const mt5Access = {
  server: process.env.MT5_SERVER ?? "",
  login: process.env.MT5_LOGIN ?? "",
  // READ-ONLY investor password. The master/trading password must never
  // appear anywhere in this codebase or its env.
  investorPassword: process.env.MT5_INVESTOR_PASSWORD ?? "",
  webTerminalUrl: process.env.MT5_WEBTERMINAL_URL ?? "https://metatraderweb.app/trade",
};

// Withdrawals: requested Saturdays, processed Sundays. Always open outside
// production so the flow can be exercised in dev.
export function withdrawalsOpenNow(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return new Date().getUTCDay() === 6; // Saturday
}

// ISO week key like "2026-W24" — used to group withdrawal processing runs.
export function currentWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

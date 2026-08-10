// Central place for env-derived config. Server-only values must never be
// imported into client components (only NEXT_PUBLIC_* are safe there).

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Chopra Capital";

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

// Company bank details shown to investors who are allowed to deposit by bank
// transfer / UPI. Empty strings mean "not configured" — the UI prompts the
// investor to contact support.
export function bankDepositDetails(): {
  accountNumber: string;
  ifsc: string;
  holder: string;
  upi: string;
} {
  return {
    accountNumber: process.env.DEPOSIT_BANK_ACCOUNT ?? "",
    ifsc: process.env.DEPOSIT_BANK_IFSC ?? "",
    holder: process.env.DEPOSIT_BANK_HOLDER ?? "",
    upi: process.env.DEPOSIT_BANK_UPI ?? "",
  };
}

// Instruction text for physical cash deposits (drop-off location, hours, etc.).
export const cashDepositInstruction: string =
  process.env.DEPOSIT_CASH_INSTRUCTION ??
  "Visit our office during business hours, hand the cash to the desk, and note the receipt number they give you.";


export const WITHDRAWAL_TIME_ZONE = "Asia/Kolkata";

function withdrawalTimeParts(date = new Date()): { weekday: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WITHDRAWAL_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? -1),
  };
}

// The bypass is deliberately opt-in and should only be enabled in a local test
// environment. Production keeps the configured withdrawal window unless explicitly bypassed.
export function withdrawalWindowTestMode(): boolean {
  return process.env.WITHDRAWAL_WINDOW_TEST_MODE === "true";
}

export function withdrawalProcessingWindowMessage(): string {
  return "Withdrawals are processed on Mondays (IST).";
}

export function withdrawalsProcessableNow(date = new Date()): boolean {
  if (withdrawalWindowTestMode()) return true;
  return withdrawalTimeParts(date).weekday === "Mon";
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

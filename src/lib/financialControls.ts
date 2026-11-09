import "server-only";
import { prisma } from "@/lib/prisma";

export const FINANCIAL_CONTROL_KEYS = {
  depositsPaused: "DEPOSITS_PAUSED",
  withdrawalsPaused: "WITHDRAWALS_PAUSED",
  depositBankPaused: "DEPOSIT_BANK_PAUSED",
  depositCryptoPaused: "DEPOSIT_CRYPTO_PAUSED",
  depositCashPaused: "DEPOSIT_CASH_PAUSED",
  withdrawalBankPaused: "WITHDRAWAL_BANK_PAUSED",
  withdrawalCryptoPaused: "WITHDRAWAL_CRYPTO_PAUSED",
  withdrawalCashPaused: "WITHDRAWAL_CASH_PAUSED",
} as const;

export type FinancialControls = {
  depositsPaused: boolean;
  withdrawalsPaused: boolean;
  depositBankPaused: boolean;
  depositCryptoPaused: boolean;
  depositCashPaused: boolean;
  withdrawalBankPaused: boolean;
  withdrawalCryptoPaused: boolean;
  withdrawalCashPaused: boolean;
};

export async function getFinancialControls(): Promise<FinancialControls> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(FINANCIAL_CONTROL_KEYS) } },
  });
  const settings = new Map(rows.map((row) => [row.key, row.value]));
  return {
    depositsPaused: settings.get(FINANCIAL_CONTROL_KEYS.depositsPaused) === "true",
    withdrawalsPaused: settings.get(FINANCIAL_CONTROL_KEYS.withdrawalsPaused) === "true",
    depositBankPaused: settings.get(FINANCIAL_CONTROL_KEYS.depositBankPaused) === "true",
    depositCryptoPaused: settings.get(FINANCIAL_CONTROL_KEYS.depositCryptoPaused) === "true",
    depositCashPaused: settings.get(FINANCIAL_CONTROL_KEYS.depositCashPaused) === "true",
    withdrawalBankPaused: settings.get(FINANCIAL_CONTROL_KEYS.withdrawalBankPaused) === "true",
    withdrawalCryptoPaused: settings.get(FINANCIAL_CONTROL_KEYS.withdrawalCryptoPaused) === "true",
    withdrawalCashPaused: settings.get(FINANCIAL_CONTROL_KEYS.withdrawalCashPaused) === "true",
  };
}

export function isFinancialMethodPaused(
  controls: FinancialControls,
  operation: "DEPOSIT" | "WITHDRAWAL",
  method: "BANK" | "CRYPTO" | "CASH",
): boolean {
  if (operation === "DEPOSIT") {
    return method === "BANK" ? controls.depositBankPaused : method === "CRYPTO" ? controls.depositCryptoPaused : controls.depositCashPaused;
  }
  return method === "BANK" ? controls.withdrawalBankPaused : method === "CRYPTO" ? controls.withdrawalCryptoPaused : controls.withdrawalCashPaused;
}

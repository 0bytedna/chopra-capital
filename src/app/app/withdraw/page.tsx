import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPortfolioMetrics } from "@/lib/portfolio";
import { getWithdrawalReferenceRate } from "@/lib/withdrawal-rate";
import { toNumber, formatUsdt } from "@/lib/money";
import { getWithdrawalEligibility } from "@/lib/financialEligibility";
import {
  getWithdrawalSchedule,
  withdrawalScheduleLabel,
} from "@/lib/withdrawalSchedule";
import { WithdrawForm, type PayoutDetails } from "./WithdrawForm";
import { getFinancialControls } from "@/lib/financialControls";

export const metadata: Metadata = { title: "Withdraw" };

export default async function WithdrawPage() {
  const user = await requireUser();
  const [metrics, banking, inrRate, schedule, controls] = await Promise.all([
    getPortfolioMetrics(user.id),
    prisma.bankingDetail.findUnique({
      where: { userId: user.id },
      select: { accountNumber: true, ifsc: true, upiId: true, accountType: true, usdtAddress: true, usdtNetwork: true },
    }),
    getWithdrawalReferenceRate(),
    getWithdrawalSchedule(),
    getFinancialControls(),
  ]);

  const payout: PayoutDetails = {
    crypto:
      banking?.usdtAddress && banking.usdtNetwork
        ? { address: banking.usdtAddress, network: banking.usdtNetwork }
        : null,
    bank: banking?.accountNumber
      ? { accountNumber: banking.accountNumber, ifsc: banking.ifsc ?? "", upiId: banking.upiId ?? "" }
      : null,
  };
  const available = toNumber(metrics.currentValue);
  const globalRestriction = controls.withdrawalsPaused
    ? { title: "Withdrawals paused", message: "New withdrawals are temporarily paused. Please try again later." }
    : null;
  const methodRestriction = (method: "BANK" | "CRYPTO" | "CASH") => {
    const paused = method === "BANK" ? controls.withdrawalBankPaused : method === "CRYPTO" ? controls.withdrawalCryptoPaused : controls.withdrawalCashPaused;
    return paused ? { title: `${method === "BANK" ? "Bank transfers" : method === "CRYPTO" ? "Crypto" : "Cash"} paused`, message: "This payment method is temporarily unavailable." } : null;
  };
  const restrictions = {
    CRYPTO: globalRestriction ?? methodRestriction("CRYPTO") ?? getWithdrawalEligibility(user, banking, "CRYPTO").restriction,
    BANK: globalRestriction ?? methodRestriction("BANK") ?? getWithdrawalEligibility(user, banking, "BANK").restriction,
    CASH: globalRestriction ?? methodRestriction("CASH") ?? getWithdrawalEligibility(user, banking, "CASH").restriction,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <p className="eyebrow">Money out</p>
        <h1 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">
          Withdraw <em className="gold-text italic">weekly</em>
        </h1>
      </header>

      <section className="glass-card flex flex-col gap-4 rounded-xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-dim">Available</p>
          <p className="currency-value mt-1 text-2xl tracking-tight text-ink">
            {formatUsdt(available)} <span className="text-sm font-medium text-ink-dim">USD</span>
          </p>
        </div>
        <div className="flex items-start gap-2 text-xs text-ink-dim sm:text-right sm:text-sm">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden />
          <p className="leading-5">
            Requests: <strong className="text-ink">{withdrawalScheduleLabel(schedule)}</strong>
          </p>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4 sm:p-7">
        <WithdrawForm
          available={available}
          referenceRate={toNumber(inrRate)}
          payout={payout}
          restrictions={restrictions}
          cryptoEnabled={user.withdrawalsEnabled && !controls.withdrawalsPaused && user.cryptoEnabled && !controls.withdrawalCryptoPaused}
          bankEnabled={user.withdrawalsEnabled && !controls.withdrawalsPaused && user.bankTransferEnabled && !controls.withdrawalBankPaused}
          cashEnabled={user.withdrawalsEnabled && !controls.withdrawalsPaused && user.cashEnabled && !controls.withdrawalCashPaused}
          twoFactorEnabled={user.twoFactorEnabled}
        />
      </section>

    </div>
  );
}

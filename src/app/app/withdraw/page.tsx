import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withdrawalsOpenNow } from "@/lib/config";
import { getPortfolioMetrics } from "@/lib/portfolio";
import { getWithdrawalReferenceRate } from "@/lib/withdrawal-rate";
import { toNumber, formatUsdt } from "@/lib/money";
import { getWithdrawalEligibility } from "@/lib/financialEligibility";
import { WithdrawForm, type PayoutDetails } from "./WithdrawForm";

export const metadata: Metadata = { title: "Withdraw" };

export default async function WithdrawPage() {
  const user = await requireUser();
  const [metrics, banking, inrRate] = await Promise.all([
    getPortfolioMetrics(user.id),
    prisma.bankingDetail.findUnique({
      where: { userId: user.id },
      select: { accountNumber: true, ifsc: true, upiId: true, accountType: true, usdtAddress: true, usdtNetwork: true },
    }),
    getWithdrawalReferenceRate(),
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
  const restrictions = {
    CRYPTO: getWithdrawalEligibility(user, banking, "CRYPTO").restriction,
    BANK: getWithdrawalEligibility(user, banking, "BANK").restriction,
    CASH: getWithdrawalEligibility(user, banking, "CASH").restriction,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <p className="eyebrow">Money out</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Withdraw <em className="gold-text italic">weekly</em>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Choose a payout method and request an amount in USD. Approved requests are processed on Monday.
        </p>
      </header>

      <section className="glass-card flex flex-col gap-4 rounded-xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-dim">Available</p>
          <p className="mt-1 font-serif text-2xl text-ink">
            {formatUsdt(available)} <span className="text-sm text-ink-dim">USD</span>
          </p>
        </div>
        <div className="flex items-start gap-2 text-sm text-ink-dim sm:text-right">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden />
          <p>
            Requests: <strong className="text-ink">Sunday, 12:00 AM–12:00 PM IST</strong>
            <br />Processed: <strong className="text-ink">Monday</strong>
          </p>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-7">
        <WithdrawForm
          open={withdrawalsOpenNow()}
          available={available}
          referenceRate={toNumber(inrRate)}
          payout={payout}
          restrictions={restrictions}
          twoFactorEnabled={user.twoFactorEnabled}
        />
      </section>

    </div>
  );
}

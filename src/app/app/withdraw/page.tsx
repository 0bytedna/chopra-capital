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
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="eyebrow">Money out</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Withdraw <em className="gold-text italic">weekly</em>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Enter the amount in USD for every withdrawal method. Crypto payouts are sent as USDT, while bank and cash payouts show an estimated INR value. Approved requests are drawn from the broker on Monday; final INR is recorded after conversion. Capital is at risk until withdrawn.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-xl p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Available balance</p>
          <p className="mt-1.5 font-serif text-3xl text-ink">
            {formatUsdt(available)} <span className="text-base text-ink-faint">USD</span>
          </p>
          <p className="mt-1 text-xs text-ink-faint">Pool holdings at current NAV plus queued balance.</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-gold-500" aria-hidden />
            <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Schedule</p>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">
            Requests: <strong className="text-ink">Sunday, 12:00 AM–12:00 PM IST</strong>
            <br />
            Processing: <strong className="text-ink">Monday</strong>
          </p>
          <p className="mt-1 text-xs text-ink-faint">A network or processing fee may apply and appears separately on your ledger.</p>
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

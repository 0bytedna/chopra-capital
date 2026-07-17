import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withdrawalsOpenNow } from "@/lib/config";
import { getPortfolioMetrics } from "@/lib/portfolio";
import { toNumber, formatUsdt } from "@/lib/money";
import { WithdrawForm, type PayoutDetails } from "./WithdrawForm";
import { WithdrawalHistory } from "./WithdrawalHistory";

export const metadata: Metadata = { title: "Withdraw" };

export default async function WithdrawPage() {
  const user = await requireUser();
  const [metrics, withdrawals, banking] = await Promise.all([
    getPortfolioMetrics(user.id),
    prisma.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.bankingDetail.findUnique({
      where: { userId: user.id },
      select: { accountNumber: true, ifsc: true, upiId: true, usdtAddress: true, usdtNetwork: true },
    }),
  ]);

  const payout: PayoutDetails = {
    crypto:
      banking?.usdtAddress && banking.usdtNetwork
        ? { address: banking.usdtAddress, network: banking.usdtNetwork }
        : null,
    bank:
      banking?.accountNumber || banking?.upiId
        ? { accountNumber: banking.accountNumber ?? "", ifsc: banking.ifsc ?? "", upiId: banking.upiId ?? "" }
        : null,
  };
  const available = toNumber(metrics.currentValue);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="eyebrow">Money out</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Withdraw <em className="gold-text italic">weekly</em>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Request a withdrawal on Sunday morning. Approved requests are processed on Monday at the prevailing NAV. There is no lock-in — your money is available every week. Capital is at risk until withdrawn.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Available balance</p>
          <p className="mt-1.5 font-serif text-3xl text-ink">
            {formatUsdt(available)} <span className="text-base text-ink-faint">USDT</span>
          </p>
          <p className="mt-1 text-xs text-ink-faint">Pool holdings at current NAV plus queued balance.</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-gold-500" aria-hidden />
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Schedule</p>
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
        <WithdrawForm open={withdrawalsOpenNow()} available={available} payout={payout} />
      </section>

      <section>
        <p className="eyebrow">History</p>
        <h2 className="mt-2 font-serif text-xl text-ink">Your withdrawal requests</h2>
        <WithdrawalHistory
          withdrawals={withdrawals.map((withdrawal) => ({
            id: withdrawal.id,
            method: withdrawal.method,
            status: withdrawal.status,
            amount: formatUsdt(withdrawal.amount),
            editAmount: withdrawal.amount.toString(),
            network: withdrawal.network,
            address: withdrawal.address,
            paidAmount: withdrawal.paidAmount === null ? null : formatUsdt(withdrawal.paidAmount),
            weekKey: withdrawal.weekKey,
            adminNote: withdrawal.adminNote,
            createdAt: withdrawal.createdAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}

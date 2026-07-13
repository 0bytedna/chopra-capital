import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { depositAddress, MIN_DEPOSIT_USDT } from "@/lib/config";
import { formatUsdt } from "@/lib/money";
import { DepositForm } from "./DepositForm";
import { ExchangeTutorials } from "@/components/app/ExchangeTutorials";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Deposit" };

const statusCls: Record<string, string> = {
  PENDING: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  CONFIRMED: "border-positive/40 bg-positive/10 text-positive",
  REJECTED: "border-negative/40 bg-negative/10 text-negative",
};

export default async function DepositPage() {
  const user = await requireUser();
  const deposits = await prisma.deposit.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="eyebrow">Money in</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Deposit <em className="gold-text italic">USDT</em>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Confirmed deposits join your queued balance and are allocated to the pool on the next
          weekly invest run. Capital at risk — returns are not guaranteed.
        </p>
      </header>

      <section className="glass-card rounded-2xl p-5 sm:p-7">
        <DepositForm
          addresses={{
            TRC20: depositAddress("TRC20"),
            ERC20: depositAddress("ERC20"),
            BEP20: depositAddress("BEP20"),
          }}
          minDeposit={MIN_DEPOSIT_USDT}
          kycApproved={user.kycStatus === "APPROVED"}
        />
      </section>

      <section>
        <p className="eyebrow">New to USDT?</p>
        <h2 className="mt-2 font-serif text-xl text-ink">Buying USDT on an exchange</h2>
        <div className="mt-4">
          <ExchangeTutorials />
        </div>
      </section>

      <section>
        <p className="eyebrow">History</p>
        <h2 className="mt-2 font-serif text-xl text-ink">Your deposits</h2>
        {deposits.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
            No deposits yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {deposits.map((d) => (
              <li key={d.id} className="glass-card flex items-center justify-between gap-3 rounded-xl px-4 py-3.5">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-ink">{formatUsdt(d.amount)} USDT</p>
                  <p className="truncate text-xs text-ink-faint">
                    {d.network} ·{" "}
                    {d.createdAt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    {d.adminNote ? ` · ${d.adminNote}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium", statusCls[d.status])}>
                  {d.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

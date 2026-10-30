import type { Metadata } from "next";
import { Gift, Users, WalletCards } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensurePublicUserId,
  MINIMUM_COMMISSION_INVESTMENT,
} from "@/lib/referrals";
import { formatUsdt } from "@/lib/money";
import { ReferralLink } from "@/components/app/ReferralLink";
import { CommissionInvestmentForm } from "@/components/app/CommissionInvestmentForm";

export const metadata: Metadata = { title: "Referrals" };

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default async function ReferralsPage() {
  const sessionUser = await requireUser();
  const publicId = await ensurePublicUserId(sessionUser.id);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: {
      referralEnabled: true,
      commissionWallet: true,
      referralsMade: {
        orderBy: { createdAt: "desc" },
        include: {
          referredUser: {
            select: { fullName: true, createdAt: true },
          },
          commissions: {
            orderBy: { distributedAt: "desc" },
            select: {
              id: true,
              amount: true,
              eligibleProfit: true,
              ratePercent: true,
              periodStart: true,
              periodEnd: true,
              distributedAt: true,
            },
          },
        },
      },
      referralCommissionsEarned: {
        orderBy: { distributedAt: "desc" },
        include: {
          referredUser: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  const walletBalance = user.commissionWallet?.balance ?? 0;
  const totalEarned = user.commissionWallet?.totalEarned ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Referral programme</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Referrals & <span className="gold-text">commission</span>
        </h1>
      </header>

      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <p className="eyebrow">Your investor ID</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xl font-bold tracking-wide text-ink">
              {publicId}
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              New investors can enter this ID on the signup page.
            </p>
          </div>
          {user.referralEnabled ? (
            <ReferralLink publicId={publicId} />
          ) : (
            <span className="rounded-lg border border-gold-600/20 bg-white px-4 py-3 text-sm text-ink-dim">
              Referral access has not been enabled for this account.
            </span>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Commission",
            value: formatUsdt(walletBalance) + " USD",
            Icon: WalletCards,
          },
          {
            label: "Total earned",
            value: formatUsdt(totalEarned) + " USD",
            Icon: Gift,
          },
          {
            label: "Referrals",
            value: String(user.referralsMade.length),
            Icon: Users,
          },
        ].map(({ label, value, Icon }) => (
          <article
            key={label}
            className="glass-card min-w-0 rounded-xl p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.13em] text-ink-faint">
                {label}
              </p>
              <Icon className="size-4 text-gold-500" aria-hidden />
            </div>
            <p className="currency-value mt-3 truncate text-lg font-semibold text-ink sm:text-xl">
              {value}
            </p>
          </article>
        ))}
      </section>

      <CommissionInvestmentForm
        balance={walletBalance.toString()}
        balanceDisplay={formatUsdt(walletBalance)}
        minimum={MINIMUM_COMMISSION_INVESTMENT.toFixed(2)}
      />

      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-gold-600/15 px-5 py-4">
          <p className="eyebrow">Referral tracking</p>
          <h2 className="mt-1 font-serif text-xl text-ink">People you referred</h2>
        </div>
        {user.referralsMade.length > 0 ? (
          <div className="divide-y divide-gold-600/10">
            {user.referralsMade.map((referral) => {
              const earned = referral.commissions.reduce(
                (total, commission) => total + Number(commission.amount),
                0,
              );
              return (
                <article
                  key={referral.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {referral.referredUser.fullName ?? "Investor"}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      Joined {formatDate(referral.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="currency-value text-sm font-semibold text-positive">
                      {formatUsdt(earned)} USD
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">commission earned</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            No investors have signed up with your referral ID yet.
          </p>
        )}
      </section>

      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-gold-600/15 px-5 py-4">
          <p className="eyebrow">Commission history</p>
          <h2 className="mt-1 font-serif text-xl text-ink">Distributed commission</h2>
        </div>
        {user.referralCommissionsEarned.length > 0 ? (
          <div className="divide-y divide-gold-600/10">
            {user.referralCommissionsEarned.map((commission) => (
              <article
                key={commission.id}
                className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {commission.referredUser.fullName ??
                      commission.referredUser.email}
                  </p>
                  <p className="mt-1 text-xs text-ink-faint">
                    {commission.periodStart} to {commission.periodEnd}
                  </p>
                </div>
                <p className="text-xs text-ink-dim">
                  {formatUsdt(commission.eligibleProfit)} USD ×{" "}
                  {commission.ratePercent.toString()}%
                </p>
                <p className="currency-value text-sm font-bold text-positive">
                  +{formatUsdt(commission.amount)} USD
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            No commission has been distributed yet.
          </p>
        )}
      </section>
    </div>
  );
}

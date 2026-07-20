import type { Metadata } from "next";
import {
  BadgeCheck,
  Clock3,
  Landmark,
  Users,
  type LucideIcon,
} from "lucide-react";
import { InvestorDirectory } from "@/components/admin/InvestorDirectory";
import { D, formatUsdt, toNumber } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin · Investors" };

function SummaryCard({
  label,
  value,
  detail,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: LucideIcon;
}) {
  return (
    <article className="glass-card rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
          <p className="mt-2 truncate font-mono text-xl text-ink">{value}</p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold-600/15 bg-gold-600/8 text-gold-400">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-xs text-ink-faint">{detail}</p>
    </article>
  );
}

export default async function AdminInvestorsPage() {
  const [users, { nav, totalUnits }] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        kycStatus: true,
        isCompanyAccount: true,
        wallet: { select: { units: true, queued: true } },
        _count: { select: { ledger: true, deposits: true, withdrawals: true, tickets: true, internalTransfersSent: true, internalTransfersReceived: true, profitShareAllocations: true } },
      },
    }),
    getCurrentNav(),
  ]);

  const totalUnitsNumber = toNumber(totalUnits);
  const rows = users.map((user) => {
    const units = D(user.wallet?.units ?? 0);
    const queued = D(user.wallet?.queued ?? 0);
    const balance = units.mul(nav).add(queued);
    const share = totalUnitsNumber > 0 ? (toNumber(units) / totalUnitsNumber) * 100 : 0;

    return {
      id: user.id,
      name: user.fullName ?? "Unnamed investor",
      email: user.email,
      mobile: user.mobile ?? "Not provided",
      kyc: user.kycStatus,
      queued: toNumber(queued),
      balance: toNumber(balance),
      share,
      isCompanyAccount: user.isCompanyAccount,
      canDelete: !user.isCompanyAccount && user._count.ledger === 0 && user._count.deposits === 0 && user._count.withdrawals === 0 && user._count.tickets === 0 && user._count.internalTransfersSent === 0 && user._count.internalTransfersReceived === 0 && user._count.profitShareAllocations === 0,
    };
  }).sort((a, b) => Number(b.isCompanyAccount) - Number(a.isCompanyAccount));

  const investorRows = rows.filter((row) => !row.isCompanyAccount);
  const verifiedCount = investorRows.filter((row) => row.kyc === "APPROVED").length;
  const totalBalance = investorRows.reduce((sum, row) => sum + row.balance, 0);
  const totalQueued = investorRows.reduce((sum, row) => sum + row.queued, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <header>
        <p className="eyebrow">Register</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Investor <em className="gold-text italic">directory</em>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-dim">
          Search investor accounts or select a row to open the complete profile,
          financial details, portfolio performance and account activity.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Investor summary">
        <SummaryCard
          label="Investors"
          value={investorRows.length.toLocaleString("en-IN")}
          detail="Registered investor accounts"
          Icon={Users}
        />
        <SummaryCard
          label="KYC verified"
          value={`${verifiedCount}/${investorRows.length}`}
          detail="Approved investor accounts"
          Icon={BadgeCheck}
        />
        <SummaryCard
          label="Total balance"
          value={`${formatUsdt(totalBalance)} USD`}
          detail="Combined invested and queued value"
          Icon={Landmark}
        />
        <SummaryCard
          label="In queue"
          value={`${formatUsdt(totalQueued)} USD`}
          detail="Confirmed funds awaiting investment"
          Icon={Clock3}
        />
      </section>

      <InvestorDirectory rows={rows} />
    </div>
  );
}
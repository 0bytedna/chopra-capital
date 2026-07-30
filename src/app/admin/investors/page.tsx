import type { Metadata } from "next";
import { InvestorDirectory } from "@/components/admin/InvestorDirectory";
import { D, formatUsdt, toNumber } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin · Investors" };

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="glass-card flex aspect-square flex-col items-center justify-center rounded-2xl p-3 text-center sm:p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p className="currency-value mt-3 max-w-full break-words text-lg text-ink sm:text-xl">
        {value}
      </p>
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
        _count: {
          select: {
            ledger: true,
            deposits: true,
            withdrawals: true,
            tickets: true,
            internalTransfersSent: true,
            internalTransfersReceived: true,
            profitShareAllocations: true,
          },
        },
      },
    }),
    getCurrentNav(),
  ]);

  const totalUnitsNumber = toNumber(totalUnits);
  const rows = users
    .map((user) => {
      const units = D(user.wallet?.units ?? 0);
      const queued = D(user.wallet?.queued ?? 0);
      const balance = units.mul(nav).add(queued);
      const share =
        totalUnitsNumber > 0
          ? (toNumber(units) / totalUnitsNumber) * 100
          : 0;

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
        canDelete:
          !user.isCompanyAccount &&
          user._count.ledger === 0 &&
          user._count.deposits === 0 &&
          user._count.withdrawals === 0 &&
          user._count.tickets === 0 &&
          user._count.internalTransfersSent === 0 &&
          user._count.internalTransfersReceived === 0 &&
          user._count.profitShareAllocations === 0,
      };
    })
    .sort((a, b) => Number(b.isCompanyAccount) - Number(a.isCompanyAccount));

  const investorRows = rows.filter((row) => !row.isCompanyAccount);
  const verifiedCount = investorRows.filter(
    (row) => row.kyc === "APPROVED",
  ).length;
  const totalBalance = investorRows.reduce(
    (sum, row) => sum + row.balance,
    0,
  );
  const totalQueued = investorRows.reduce(
    (sum, row) => sum + row.queued,
    0,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <header>
        <p className="eyebrow">Register</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Investor <em className="gold-text italic">directory</em>
        </h1>
      </header>

      <section
        className="mx-auto grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-4"
        aria-label="Investor summary"
      >
        <SummaryCard
          label="Investors"
          value={investorRows.length.toLocaleString("en-IN")}
        />
        <SummaryCard
          label="KYC verified"
          value={`${verifiedCount}/${investorRows.length}`}
        />
        <SummaryCard
          label="Total balance"
          value={`${formatUsdt(totalBalance)} USD`}
        />
        <SummaryCard
          label="In queue"
          value={`${formatUsdt(totalQueued)} USD`}
        />
      </section>

      <InvestorDirectory rows={rows} />
    </div>
  );
}
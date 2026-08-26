import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpFromLine,
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  FileText,
  Landmark,
  Mail,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { CollapsibleCard } from "@/components/admin/CollapsibleCard";
import { DepositMethodsToggle } from "@/components/admin/DepositMethodsToggle";
import { InvestorAdminControls } from "@/components/admin/InvestorAdminControls";
import { PortfolioChart } from "@/components/app/PortfolioChart";
import { cn } from "@/lib/cn";
import { formatInr, formatUsdt, toNumber } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { getPortfolioMetrics, getPortfolioSeries } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin · Investor record" };

const kycDetails = {
  NOT_SUBMITTED: {
    label: "Not submitted",
    className: "border-ink-faint/25 bg-ink/5 text-ink-faint",
  },
  PENDING: {
    label: "In review",
    className: "border-gold-500/30 bg-gold-500/10 text-gold-300",
  },
  APPROVED: {
    label: "Verified",
    className: "border-positive/30 bg-positive/10 text-positive",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-negative/30 bg-negative/10 text-negative",
  },
} as const;

const depositStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  NEEDS_CORRECTION: "Action needed",
  RECEIVED: "Payment received",
  QUEUED: "In queue",
  CONFIRMED: "Invested",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const withdrawalStatusLabels: Record<string, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  BROKER_RECEIVED: "Received from broker",
  INR_READY: "INR ready",
  PAYOUT_DETAILS_REQUIRED: "Bank details required",
  PAYOUT_DETAILS_REVIEW: "Bank details in review",
  PROCESSED: "Processed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const methodLabels: Record<string, string> = {
  CRYPTO: "Crypto",
  BANK: "Bank transfer",
  CASH: "Cash",
};

function formatDate(date: Date, withTime = false) {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime
      ? { hour: "2-digit", minute: "2-digit", hour12: true }
      : {}),
  });
}

function display(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

function signedUsd(value: unknown) {
  const numeric = toNumber(value as never);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${formatUsdt(numeric)} USD`;
}

function MetricCard({
  label,
  value,
  secondaryValue,
  detail,
  Icon,
  tone,
}: {
  label: string;
  value: string;
  secondaryValue?: string;
  detail?: string;
  Icon: typeof WalletCards;
  tone?: "positive" | "negative";
}) {
  return (
    <article className="relative min-w-0 rounded-xl border border-gold-600/12 bg-white/55 p-3 sm:p-4">
      <p className="pr-7 text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p
        className={cn(
          "currency-value mt-1.5 whitespace-nowrap text-[clamp(0.78rem,3.6vw,1.125rem)]",
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : "text-ink",
        )}
      >
        {value}
      </p>
      {secondaryValue && (
        <p className="currency-value mt-1 whitespace-nowrap text-[clamp(0.72rem,3.2vw,1rem)] text-ink">
          {secondaryValue}
        </p>
      )}
      <span className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-md border border-gold-600/15 bg-gold-600/8 text-gold-400 sm:right-3 sm:top-3">
        <Icon className="size-3" aria-hidden />
      </span>
      {detail && (
        <p className="mt-1.5 line-clamp-2 text-[0.7rem] leading-4 text-ink-faint">
          {detail}
        </p>
      )}
    </article>
  );
}

function Detail({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 border-b border-gold-600/10 pb-2.5",
        wide && "col-span-2",
      )}
    >
      <dt className="text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
      <dd className={cn("mt-1 break-words text-sm leading-5 text-ink", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

export default async function AdminInvestorRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const investor = await prisma.user.findFirst({
    where: { id, role: "USER" },
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,

      kycStatus: true,
      isCompanyAccount: true,
      kycNote: true,
      bankTransferEnabled: true,
      cashEnabled: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
      bankingDetail: true,
      kycDocuments: { orderBy: { createdAt: "desc" } },
      deposits: { orderBy: { createdAt: "desc" } },
      withdrawals: { orderBy: { createdAt: "desc" } },
      profitShareAllocations: {
        orderBy: { createdAt: "desc" },
        include: {
          run: {
            select: {
              frequency: true,
              periodKey: true,
              mode: true,
              createdAt: true,
            },
          },
        },
      },
      internalTransfersSent: {
        orderBy: { createdAt: "desc" },
        include: {
          toUser: { select: { id: true, fullName: true, email: true } },
          admin: { select: { fullName: true, email: true } },
        },
      },
      internalTransfersReceived: {
        orderBy: { createdAt: "desc" },
        include: {
          fromUser: { select: { id: true, fullName: true, email: true } },
          admin: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  if (!investor) notFound();

  const [metrics, performance, navState] = await Promise.all([
    getPortfolioMetrics(investor.id),
    getPortfolioSeries(investor.id),
    getCurrentNav(),
  ]);

  const poolShare = navState.totalUnits.gt(0)
    ? toNumber(metrics.units.div(navState.totalUnits).mul(100))
    : 0;
  const investedValue = metrics.units.mul(metrics.nav);
  const totalProfit = metrics.bookedProfit.add(metrics.unrealizedProfit);
  const profitTone = totalProfit.gt(0) ? "positive" : totalProfit.lt(0) ? "negative" : undefined;
  const kyc = kycDetails[investor.kycStatus];

  const transfers = [
    ...investor.internalTransfersSent.map((transfer) => ({
      ...transfer,
      direction: "SENT" as const,
      counterparty: transfer.toUser,
    })),
    ...investor.internalTransfersReceived.map((transfer) => ({
      ...transfer,
      direction: "RECEIVED" as const,
      counterparty: transfer.fromUser,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
      <header>
        <Link
          href="/admin/investors"
          className="inline-flex items-center gap-2 text-xs text-ink-faint transition-colors hover:text-gold-300"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to investors
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Complete investor record</p>
            <h1 className="mt-2 font-serif text-3xl text-ink">
              {investor.fullName ?? "Unnamed investor"}
            </h1>
            <p className="mt-2 text-sm text-ink-dim">{investor.email}</p>
          </div>
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
              kyc.className,
            )}
          >
            <ShieldCheck className="size-3.5" aria-hidden />
            KYC {kyc.label.toLowerCase()}
          </span>
        </div>
      </header>

      <InvestorAdminControls
        investor={{
          id: investor.id,
          fullName: investor.fullName,
          email: investor.email,
          mobile: investor.mobile,
          kycStatus: investor.kycStatus,
          kycNote: investor.kycNote,
          bankTransferEnabled: investor.bankTransferEnabled,
          cashEnabled: investor.cashEnabled,
          bankingDetail: investor.bankingDetail,
        }}
        queued={metrics.queued.toFixed(2)}
        invested={investedValue.toFixed(2)}
        deposits={investor.deposits.map((deposit) => ({ id: deposit.id, method: methodLabels[deposit.method], amount: deposit.amount.toString(), status: deposit.status, reference: deposit.reference, txHash: deposit.txHash, adminNote: deposit.adminNote }))}
        withdrawals={investor.withdrawals.map((withdrawal) => ({ id: withdrawal.id, method: methodLabels[withdrawal.method], amount: withdrawal.amount.toString(), status: withdrawal.status, reference: withdrawal.txHash, adminNote: withdrawal.adminNote }))}
      />
      <CollapsibleCard
        title="Portfolio summary"
        Icon={WalletCards}
        contentClassName="p-3 sm:p-4"
      >
        <section
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
          aria-label="Investor portfolio summary"
        >
          <MetricCard
            label="Balance"
            value={`${formatUsdt(metrics.currentValue)} USD`}
            detail="Invested and queued"
            Icon={WalletCards}
          />
          <MetricCard
            label="In queue"
            value={`${formatUsdt(metrics.queued)} USD`}
            secondaryValue={`${formatInr(metrics.pendingInr)} INR`}
            detail="Awaiting investment or conversion"
            Icon={Clock3}
          />
          <MetricCard
            label="Generated profit"
            value={signedUsd(totalProfit)}
            detail="Booked and floating"
            Icon={CircleDollarSign}
            tone={profitTone}
          />
          <MetricCard
            label="Pool share"
            value={`${poolShare.toFixed(2)}%`}
            detail="Current invested units"
            Icon={BadgeCheck}
          />
          <MetricCard
            label="Total deposits"
            value={`${formatUsdt(metrics.totalDeposits)} USD`}
            Icon={ArrowDownToLine}
          />
          <MetricCard
            label="Total withdrawals"
            value={`${formatUsdt(metrics.netWithdrawals)} USD`}
            Icon={ArrowUpFromLine}
          />
        </section>
      </CollapsibleCard>

      <CollapsibleCard title="Profit and balance history" Icon={CircleDollarSign}>
        <PortfolioChart
          initialSeries={performance.series}
          firstActivityDate={performance.firstActivityDate}
          endpoint={`/api/admin/investors/${encodeURIComponent(investor.id)}/portfolio`}
        />
      </CollapsibleCard>
      <section className="grid gap-4 xl:grid-cols-2" aria-label="Funding history">
        <CollapsibleCard
          title="Deposits"
          Icon={ArrowDownToLine}
          count={investor.deposits.length}
          contentClassName="p-0"
        >
          <div className="max-h-[32rem] overflow-auto">
            {investor.deposits.length > 0 ? (
              <table className="w-full min-w-[38rem] text-left text-xs">
                <thead className="sticky top-0 bg-vault-900 text-xs uppercase tracking-[0.14em] text-ink-faint">
                  <tr>
                    <th className="px-2 py-3 font-medium">Date</th>
                    <th className="px-2 py-3 font-medium">Method</th>
                    <th className="px-2 py-3 font-medium">Requested</th>
                    <th className="px-2 py-3 font-medium">USD / USDT</th>
                    <th className="px-2 py-3 font-medium">Status</th>
                    <th className="px-2 py-3 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-600/10">
                  {investor.deposits.map((deposit) => (
                    <tr key={deposit.id}>
                      <td className="px-2 py-3 text-ink-dim">{formatDate(deposit.createdAt)}</td>
                      <td className="px-2 py-3 text-ink">{methodLabels[deposit.method]}</td>
                      <td className="currency-value px-2 py-3 text-ink">
                        {deposit.inrAmount !== null
                          ? `${formatInr(deposit.inrAmount)} INR`
                          : `${formatUsdt(deposit.reportedUsdtAmount ?? deposit.amount)} USDT`}
                      </td>
                      <td className="currency-value px-2 py-3 text-ink">
                        {formatUsdt(deposit.queuedUsdtAmount ?? deposit.amount)} USD
                      </td>
                      <td className="px-2 py-3 text-ink-dim">
                        {depositStatusLabels[deposit.status] ?? deposit.status}
                      </td>
                      <td className="max-w-44 truncate px-2 py-3 font-mono text-ink-faint" title={deposit.txHash ?? deposit.reference ?? ""}>
                        {deposit.txHash ?? deposit.reference ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-ink-faint">No deposit history.</p>
            )}
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Withdrawals"
          Icon={ArrowUpFromLine}
          count={investor.withdrawals.length}
          contentClassName="p-0"
        >
          <div className="max-h-[32rem] overflow-auto">
            {investor.withdrawals.length > 0 ? (
              <table className="w-full min-w-[38rem] text-left text-xs">
                <thead className="sticky top-0 bg-vault-900 text-xs uppercase tracking-[0.14em] text-ink-faint">
                  <tr>
                    <th className="px-2 py-3 font-medium">Date</th>
                    <th className="px-2 py-3 font-medium">Method</th>
                    <th className="px-2 py-3 font-medium">Requested</th>
                    <th className="px-2 py-3 font-medium">Paid</th>
                    <th className="px-2 py-3 font-medium">Status</th>
                    <th className="px-2 py-3 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-600/10">
                  {investor.withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id}>
                      <td className="px-2 py-3 text-ink-dim">{formatDate(withdrawal.createdAt)}</td>
                      <td className="px-2 py-3 text-ink">{methodLabels[withdrawal.method]}</td>
                      <td className="currency-value px-2 py-3 text-ink">{formatUsdt(withdrawal.amount)} USD</td>
                      <td className="currency-value px-2 py-3 text-ink">
                        {withdrawal.paidInrAmount !== null
                          ? `${formatInr(withdrawal.paidInrAmount)} INR`
                          : withdrawal.paidAmount !== null
                            ? `${formatUsdt(withdrawal.paidAmount)} USDT`
                            : "—"}
                      </td>
                      <td className="px-2 py-3 text-ink-dim">
                        {withdrawalStatusLabels[withdrawal.status] ?? withdrawal.status}
                      </td>
                      <td className="max-w-44 truncate px-2 py-3 font-mono text-ink-faint" title={withdrawal.txHash ?? ""}>
                        {withdrawal.txHash ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-ink-faint">No withdrawal history.</p>
            )}
          </div>
        </CollapsibleCard>
      </section>

      <section aria-label="Internal transfer history">
        <CollapsibleCard
          title="Internal transfers"
          Icon={ArrowLeftRight}
          count={transfers.length}
        >
          <div className="mb-3 flex justify-end">
            <Link
              href="/admin/internal-transfers"
              className="text-xs text-gold-400 transition-colors hover:text-gold-300"
            >
              Open transfers
            </Link>
          </div>
          <div className="max-h-[28rem] overflow-auto">
            {transfers.length > 0 ? (
              <div className="divide-y divide-gold-600/10">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-ink">
                          {transfer.direction === "SENT" ? "Sent to" : "Received from"}{" "}
                          <Link
                            href={`/admin/investors/${transfer.counterparty.id}`}
                            className="text-gold-300 hover:text-gold-400"
                          >
                            {transfer.counterparty.fullName ?? transfer.counterparty.email}
                          </Link>
                        </p>
                        <p className="mt-1 text-xs text-ink-faint">
                          {formatDate(transfer.createdAt, true)}
                          {transfer.note ? ` · ${transfer.note}` : ""}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "currency-value shrink-0 text-sm",
                          transfer.direction === "SENT" ? "text-negative" : "text-positive",
                        )}
                      >
                        {transfer.direction === "SENT" ? "−" : "+"}
                        {formatUsdt(transfer.amount)} USD
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-ink-faint">No internal transfers.</p>
            )}
          </div>
        </CollapsibleCard>
      </section>
      <section className="grid items-start gap-3 lg:grid-cols-3" aria-label="Investor details">
        <CollapsibleCard title="Profile & compliance" Icon={Mail}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Detail label="Full name" value={display(investor.fullName)} />
            <Detail label="Phone" value={display(investor.mobile)} />
            <Detail label="Email" value={investor.email} wide />
            <Detail
              label="Account type"
              value={investor.isCompanyAccount ? "Company trading account" : "Investor account"}
            />
            <Detail label="KYC status" value={kyc.label} />
            <Detail label="KYC note" value={display(investor.kycNote)} wide />
            <Detail
              label="Two-factor authentication"
              value={investor.twoFactorEnabled ? "Enabled" : "Not enabled"}
            />
            <Detail label="Account created" value={formatDate(investor.createdAt, true)} />
            <Detail
              label="Profile last updated"
              value={formatDate(investor.updatedAt, true)}
              wide
            />
          </dl>

          <div className="mt-4 border-t border-gold-600/15 pt-4">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">KYC documents</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {investor.kycDocuments.length > 0 ? (
                investor.kycDocuments.map((document) => (
                  <a
                    key={document.id}
                    href={`/api/admin/kyc-file?id=${document.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gold-600/20 px-3 py-2 text-xs text-ink-dim transition-colors hover:border-gold-500/45 hover:text-ink"
                  >
                    <FileText className="size-3.5 text-gold-400" aria-hidden />
                    {document.docType} · {formatDate(document.createdAt)}
                  </a>
                ))
              ) : (
                <p className="text-xs text-ink-faint">No KYC documents on file.</p>
              )}
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Banking details" Icon={Landmark}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Detail
              label="Account number"
              value={display(investor.bankingDetail?.accountNumber)}
              mono
            />
            <Detail label="IFSC" value={display(investor.bankingDetail?.ifsc)} mono />
            <Detail
              label="Account type"
              value={investor.bankingDetail?.accountType?.replaceAll("_", " ") ?? "Not provided"}
            />
            <Detail label="UPI ID" value={display(investor.bankingDetail?.upiId)} mono />
          </dl>
        </CollapsibleCard>

        <CollapsibleCard title="Crypto & funding" Icon={WalletCards}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Detail
              label="USDT wallet address"
              value={display(investor.bankingDetail?.usdtAddress)}
              mono
              wide
            />
            <Detail label="USDT network" value={display(investor.bankingDetail?.usdtNetwork)} />
            <Detail label="Crypto deposits" value="Enabled" />
            <Detail
              label="Bank access"
              value={investor.bankTransferEnabled ? "Enabled" : "Disabled"}
            />
            <Detail
              label="Cash access"
              value={investor.cashEnabled ? "Enabled" : "Disabled"}
            />
          </dl>
          <div className="mt-4 border-t border-gold-600/15 pt-4">
            <p className="mb-3 text-xs uppercase tracking-[0.14em] text-ink-faint">
              Deposit method access
            </p>
            <DepositMethodsToggle
              userId={investor.id}
              bankEnabled={investor.bankTransferEnabled}
              cashEnabled={investor.cashEnabled}
            />
          </div>
        </CollapsibleCard>
      </section>
    </div>
  );
}

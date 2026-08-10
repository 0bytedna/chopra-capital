import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { formatUsdt, type Dec } from "@/lib/money";
import {
  getWithdrawalSchedule,
  WITHDRAWAL_WEEKDAYS,
  withdrawalScheduleLabel,
} from "@/lib/withdrawalSchedule";
import { BulkBrokerWithdrawalForm } from "@/components/admin/BulkBrokerWithdrawalForm";
import { WithdrawalReviewActions } from "@/components/admin/ReviewDecisionButtons";
import { WithdrawalSettlementTabs } from "@/components/admin/WithdrawalSettlementTabs";
import { WithdrawalDistributionPanels } from "@/components/admin/WithdrawalDistributionPanels";
import {
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  adminUpdateWithdrawalSchedule,
} from "../actions";

export const metadata: Metadata = { title: "Admin · Withdrawals" };

type WithdrawalMethod = "CRYPTO" | "BANK" | "CASH";

const investorSelect = {
  email: true,
  fullName: true,
  mobile: true,
  address: true,
  city: true,
  state: true,
  bankingDetail: {
    select: {
      accountNumber: true,
      ifsc: true,
      upiId: true,
      accountType: true,
      usdtAddress: true,
      usdtNetwork: true,
    },
  },
} as const;

function methodShortLabel(method: WithdrawalMethod): string {
  if (method === "CRYPTO") return "Crypto";
  if (method === "BANK") return "Bank transfer";
  return "Cash";
}

function requestedAmountLabel(usdAmount: Dec): string {
  return formatUsdt(usdAmount) + " USD";
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-3 text-center text-sm text-ink-faint">
      {children}
    </p>
  );
}

export default async function AdminWithdrawalsPage() {
  const [requested, approved, brokerReceived, inrReady, payoutCorrections, schedule] =
    await Promise.all([
      prisma.withdrawal.findMany({
        where: { status: "REQUESTED" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: investorSelect } },
      }),
      prisma.withdrawal.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: investorSelect } },
      }),
      prisma.withdrawal.findMany({
        where: { status: "BROKER_RECEIVED" },
        orderBy: { brokerReceivedAt: "asc" },
        include: { user: { select: investorSelect } },
      }),
      prisma.withdrawal.findMany({
        where: { status: "INR_READY" },
        orderBy: { convertedAt: "asc" },
        include: { user: { select: investorSelect } },
      }),
      prisma.withdrawal.findMany({
        where: { status: { in: ["PAYOUT_DETAILS_REQUIRED", "PAYOUT_DETAILS_REVIEW"] } },
        orderBy: { payoutCorrectionRequestedAt: "asc" },
        include: { user: { select: investorSelect } },
      }),
      getWithdrawalSchedule(),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header>
        <p className="eyebrow">Money out</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Withdrawal <em className="gold-text italic">settlement</em>
        </h1>

      </header>

      <details className="glass-card rounded-xl p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none flex-col items-start justify-between gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="whitespace-nowrap text-sm font-medium text-ink">Withdrawal window</span>
          <span className="whitespace-nowrap text-left text-xs text-blue-700 sm:text-right sm:text-sm">
            {withdrawalScheduleLabel(schedule)}
          </span>
        </summary>
        <AdminActionForm
          action={adminUpdateWithdrawalSchedule}
          submitLabel="Save schedule"
          pendingLabel="Saving…"
          className="mt-4 border-t border-slate-200 pt-4"
          submitClassName="w-full sm:w-auto"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-ink-dim">
              Day
              <select
                name="weekday"
                defaultValue={schedule.weekday}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink outline-none focus:border-blue-400"
              >
                {WITHDRAWAL_WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-ink-dim">
              Opens
              <input
                type="time"
                name="startTime"
                defaultValue={schedule.startTime}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink outline-none focus:border-blue-400"
              />
            </label>
            <label className="space-y-1 text-xs uppercase tracking-[0.12em] text-ink-dim">
              Closes
              <input
                type="time"
                name="endTime"
                defaultValue={schedule.endTime}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-ink outline-none focus:border-blue-400"
              />
            </label>
          </div>
        </AdminActionForm>
      </details>

      <section className="space-y-3">
        <div>
          <p className="eyebrow">Step 1 - Approval</p>
        </div>
        {requested.length === 0 ? (
          <EmptyState>No new withdrawal requests.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gold-600/15 bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-vault-950/45 text-xs uppercase tracking-[0.12em] text-ink-dim">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Investor</th>
                  <th scope="col" className="px-4 py-3 font-medium">Method</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">USD requested</th>
                  <th scope="col" className="px-4 py-3 font-medium">Requested</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-600/10">
                {requested.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-vault-950/25">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">
                        {withdrawal.user.fullName ?? "Unnamed investor"}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-dim">{withdrawal.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {methodShortLabel(withdrawal.method)}
                    </td>
                    <td className="currency-value whitespace-nowrap px-4 py-3 text-right text-sm text-ink">
                      {requestedAmountLabel(withdrawal.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-dim">
                      {withdrawal.createdAt.toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <WithdrawalReviewActions
                        id={withdrawal.id}
                        grossUsd={withdrawal.amount.toString()}
                        approveAction={adminApproveWithdrawal}
                        rejectAction={adminRejectWithdrawal}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <p className="eyebrow">Step 2 - Broker Withdrawal</p>
        </div>
        <BulkBrokerWithdrawalForm
          withdrawals={approved.map((withdrawal) => ({
            id: withdrawal.id,
            investor: withdrawal.user.fullName ?? "Unnamed investor",
            email: withdrawal.user.email,
            method: withdrawal.method,
            amount: withdrawal.amount.toString(),
            weekKey: withdrawal.weekKey,
          }))}
        />
      </section>
      <section className="space-y-3">
        <div>
          <p className="eyebrow">Step 3 - INR to USDT Conversion</p>
        </div>
        <WithdrawalSettlementTabs
          withdrawals={brokerReceived.map((withdrawal) => ({
            id: withdrawal.id,
            method: withdrawal.method,
            investor: withdrawal.user.fullName ?? "Unnamed investor",
            email: withdrawal.user.email,
            amount: withdrawal.amount.toString(),
            brokerReceivedUsdt:
              withdrawal.brokerReceivedUsdt?.toString() ?? "0",
            network:
              withdrawal.user.bankingDetail?.usdtNetwork ??
              withdrawal.network,
            address:
              withdrawal.user.bankingDetail?.usdtAddress ??
              withdrawal.address,
          }))}
        />
      </section>
      <section className="space-y-3">
        <div>
          <p className="eyebrow">Step 4 - Funds Distribution</p>
        </div>
        <WithdrawalDistributionPanels
          cryptoWithdrawals={brokerReceived
            .filter((withdrawal) => withdrawal.method === "CRYPTO")
            .map((withdrawal) => ({
              id: withdrawal.id,
              method: "CRYPTO",
              investor: withdrawal.user.fullName ?? "Unnamed investor",
              email: withdrawal.user.email,
              amount: withdrawal.amount.toString(),
              brokerReceivedUsdt:
                withdrawal.brokerReceivedUsdt?.toString() ?? "0",
              network:
                withdrawal.user.bankingDetail?.usdtNetwork ??
                withdrawal.network,
              address:
                withdrawal.user.bankingDetail?.usdtAddress ??
                withdrawal.address,
            }))}
          inrWithdrawals={inrReady.map((withdrawal) => ({
            id: withdrawal.id,
            method: withdrawal.method as "BANK" | "CASH",
            convertedInrAmount:
              withdrawal.convertedInrAmount?.toString() ?? "0",
            payoutAccountNumber: withdrawal.payoutAccountNumber,
            payoutIfsc: withdrawal.payoutIfsc,
            payoutUpiId: withdrawal.payoutUpiId,
            payoutAccountType: withdrawal.payoutAccountType,
            user: {
              email: withdrawal.user.email,
              fullName: withdrawal.user.fullName,
              mobile: withdrawal.user.mobile,
              bankingDetail: withdrawal.user.bankingDetail,
            },
          }))}
          payoutCorrections={payoutCorrections.map((withdrawal) => ({
            id: withdrawal.id,
            status: withdrawal.status as
              | "PAYOUT_DETAILS_REQUIRED"
              | "PAYOUT_DETAILS_REVIEW",
            convertedInrAmount:
              withdrawal.convertedInrAmount?.toString() ?? "0",
            payoutCorrectionNote: withdrawal.payoutCorrectionNote,
            payoutAccountNumber: withdrawal.payoutAccountNumber,
            payoutIfsc: withdrawal.payoutIfsc,
            payoutUpiId: withdrawal.payoutUpiId,
            payoutAccountType: withdrawal.payoutAccountType,
            proposedAccountNumber: withdrawal.proposedAccountNumber,
            proposedIfsc: withdrawal.proposedIfsc,
            proposedUpiId: withdrawal.proposedUpiId,
            proposedAccountType: withdrawal.proposedAccountType,
            user: {
              email: withdrawal.user.email,
              fullName: withdrawal.user.fullName,
            },
          }))}
        />
      </section>

    </div>
  );
}

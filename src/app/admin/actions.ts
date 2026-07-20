"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { D, formatInr } from "@/lib/money";
import {
  removeStoredTicketAttachments,
  storeTicketAttachments,
  ticketFilesFrom,
} from "@/lib/ticketAttachments";
import {
  allocateDepositBatch,
  confirmDepositReceipt,
  investQueuedDepositBatch,
  rejectDeposit,
  approveWithdrawal,
  completeWithdrawalPayout,
  recordBrokerWithdrawalBatch,
  recordWithdrawalConversionBatch,
  rejectWithdrawal,
  createInternalTransfer,
} from "@/lib/wallet";
import { investQueuedCompanyCapital, queueCompanyCapital, withdrawCompanyCapital } from "@/lib/companyCapital";

export type AdminFormState = { error?: string; success?: string };

function fail(err: unknown): AdminFormState {
  return { error: err instanceof Error ? err.message : "Something went wrong" };
}

// --- Investor accounts ------------------------------------------------------

export async function adminDeleteInvestor(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Investor not found." };

  const investor = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isCompanyAccount: true,
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
  });
  if (!investor || investor.role !== "USER" || investor.isCompanyAccount) {
    return { error: "Only ordinary investor accounts can be deleted." };
  }
  const activityCount = Object.values(investor._count).reduce((total, count) => total + count, 0);
  if (activityCount > 0) {
    return { error: "This investor has financial or support history and cannot be permanently deleted. Audit records must be retained." };
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/admin/investors");
  revalidatePath("/admin");
  return { success: "Investor account deleted." };
}
// --- Company capital --------------------------------------------------------

export async function adminQueueCompanyCapital(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  try {
    const result = await queueCompanyCapital(D(amountRaw), reference || undefined);
    revalidatePath("/admin/profit-share");
    revalidatePath("/admin/investors");
    revalidatePath("/admin/investors/[id]", "page");
    revalidatePath("/admin");
    return { success: `${result.amount.toFixed(2)} USD added to the company investment queue.` };
  } catch (error) {
    return fail(error);
  }
}

export async function adminInvestCompanyCapital(_prev: AdminFormState, _formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  try {
    const result = await investQueuedCompanyCapital();
    revalidatePath("/admin/profit-share");
    revalidatePath("/admin/investors");
    revalidatePath("/admin/investors/[id]", "page");
    revalidatePath("/admin");
    return { success: `${result.amount.toFixed(2)} USD invested for the company at NAV ${result.nav.toFixed(6)}.` };
  } catch (error) {
    return fail(error);
  }
}

export async function adminWithdrawCompanyCapital(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  try {
    const result = await withdrawCompanyCapital(D(amountRaw), reference);
    revalidatePath("/admin/profit-share");
    revalidatePath("/admin/investors");
    revalidatePath("/admin/investors/[id]", "page");
    revalidatePath("/admin");
    return { success: `${result.queuedUsed.add(result.investedAmount).toFixed(2)} USD withdrawn from the company account.` };
  } catch (error) {
    return fail(error);
  }
}
// --- Internal transfers -----------------------------------------------------

export async function adminCreateInternalTransfer(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const fromUserId = String(formData.get("fromUserId") ?? "");
  const toUserId = String(formData.get("toUserId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const note = String(formData.get("note") ?? "");

  let amount;
  try {
    amount = D(amountRaw);
  } catch {
    return { error: "Enter a valid USD transfer amount." };
  }

  try {
    const result = await createInternalTransfer({
      fromUserId,
      toUserId,
      adminId: admin.id,
      amount,
      note,
    });

    revalidatePath("/admin/internal-transfers");
    revalidatePath("/admin/investors");
    revalidatePath(`/admin/investors/${fromUserId}`);
    revalidatePath(`/admin/investors/${toUserId}`);
    revalidatePath("/app");

    const source = result.fromInvestor.fullName ?? result.fromInvestor.email;
    const recipient = result.toInvestor.fullName ?? result.toInvestor.email;
    return {
      success: `${result.transfer.amount.toFixed(2)} USD transferred from ${source} to ${recipient}.`,
    };
  } catch (err) {
    return fail(err);
  }
}
// --- Deposits ---------------------------------------------------------------

export async function adminConfirmDeposit(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Deposit not found." };

  let result;
  try {
    result = await confirmDepositReceipt(id, String(formData.get("note") ?? "") || undefined);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/deposits");
  revalidatePath("/admin");
  revalidatePath("/app/deposit");
  revalidatePath("/app/history");
  return {
    success:
      result.status === "QUEUED"
        ? "Crypto confirmed and moved to the company-wallet queue."
        : "INR payment confirmed. It is now waiting for conversion to USDT.",
  };
}

export async function adminAllocateDeposits(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const method = String(formData.get("method") ?? "");
  const depositIds = formData.getAll("depositIds").map(String).filter(Boolean);
  const totalUsdtRaw = String(formData.get("totalUsdt") ?? "").trim();

  if (method !== "CRYPTO" && method !== "BANK" && method !== "CASH") {
    return { error: "Choose a valid deposit method." };
  }
  if (depositIds.length === 0) return { error: "Select at least one verified deposit." };

  let totalUsdt;
  try {
    totalUsdt = D(totalUsdtRaw);
  } catch {
    return { error: "Enter a valid total USDT amount." };
  }
  if (totalUsdt.lte(0)) return { error: "Enter a total USDT amount greater than zero." };

  try {
    const result = await allocateDepositBatch(method, depositIds, totalUsdt, admin.id);
    revalidatePath("/admin/deposits");
    revalidatePath("/admin");
    revalidatePath("/app");
    revalidatePath("/app/deposit");
  revalidatePath("/app/history");
    return {
      success: `${result.totalUsdt.toFixed(2)} USDT distributed across ${result.allocations.length} deposit${result.allocations.length === 1 ? "" : "s"} and added to queue.`,
    };
  } catch (err) {
    return fail(err);
  }
}

export async function adminInvestQueuedDeposits(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const depositIds = formData.getAll("depositIds").map(String).filter(Boolean);
  const totalReceivedRaw = String(formData.get("totalReceivedUsdt") ?? "").trim();
  if (depositIds.length === 0) return { error: "Select at least one queued deposit." };

  let totalReceivedUsdt;
  try {
    totalReceivedUsdt = D(totalReceivedRaw);
  } catch {
    return { error: "Enter a valid USDT amount received by the broker." };
  }
  if (totalReceivedUsdt.lte(0)) return { error: "Broker-received USDT must be greater than zero." };

  try {
    const result = await investQueuedDepositBatch(depositIds, totalReceivedUsdt, admin.id);
    const transferFee = result.totalQueuedUsdt.sub(result.totalReceivedUsdt);
    revalidatePath("/admin/deposits");
    revalidatePath("/admin");
    revalidatePath("/app");
    revalidatePath("/app/deposit");
  revalidatePath("/app/history");
    return {
      success: `${result.totalReceivedUsdt.toFixed(2)} USDT invested across ${result.allocations.length} deposit${result.allocations.length === 1 ? "" : "s"} at NAV ${result.investmentNav.toFixed(6)}. Transfer fees: ${transferFee.toFixed(2)} USDT.`,
    };
  } catch (err) {
    return fail(err);
  }
}

export async function adminRejectDeposit(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    await rejectDeposit(id, String(formData.get("note") ?? "") || undefined);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/deposits");
  revalidatePath("/admin");
  return { success: "Deposit rejected." };
}

export async function adminRequestDepositCorrection(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !note) return { error: "Explain what the investor needs to correct." };

  const deposit = await prisma.deposit.findUnique({ where: { id }, select: { method: true, status: true } });
  if (!deposit) return { error: "Deposit not found." };
  if (deposit.status !== "PENDING") return { error: "Only pending deposits can be sent back for correction." };
  if (deposit.method === "CASH") return { error: "Cash deposits do not have a UTR or transaction hash to correct." };

  const result = await prisma.deposit.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "NEEDS_CORRECTION", adminNote: note },
  });
  if (result.count === 0) return { error: "Deposit is no longer pending." };

  revalidatePath("/app/deposit");
  revalidatePath("/app/history");
  revalidatePath("/admin/deposits");
  revalidatePath("/admin");
  return { success: "Correction requested. The deposit cannot be credited until the investor resubmits the details." };
}

// --- Deposit method enablement (per investor) -------------------------------

export async function adminSetDepositMethods(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Missing investor." };
  const bankTransferEnabled = formData.get("bankTransferEnabled") != null;
  const cashEnabled = formData.get("cashEnabled") != null;
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { bankTransferEnabled, cashEnabled },
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/investors");
  revalidatePath("/admin");
  return { success: "Deposit methods updated." };
}

// --- Withdrawals ------------------------------------------------------------

export async function adminApproveWithdrawal(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const grossUsd = Number(formData.get("grossUsd") ?? 0);
  if (!id || !Number.isFinite(grossUsd) || grossUsd <= 0) {
    return { error: "Enter a valid USD amount to withdraw from the broker." };
  }

  try {
    await approveWithdrawal(id, D(grossUsd), String(formData.get("note") ?? "") || undefined);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/app/withdraw");
  revalidatePath("/app/history");
  return { success: "Withdrawal approved. It is ready for the bulk broker withdrawal." };
}

export async function adminRecordBrokerWithdrawalBatch(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const withdrawalIds = formData
    .getAll("withdrawalIds")
    .map((value) => String(value))
    .filter(Boolean);
  if (withdrawalIds.length === 0) {
    return { error: "Select at least one approved withdrawal." };
  }

  let result;
  try {
    result = await recordBrokerWithdrawalBatch(withdrawalIds);
  } catch (err) {
    return fail(err);
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/withdraw");
  revalidatePath("/app/history");
  return {
    success: `${result.totalUsd.toFixed(2)} USD withdrawn from the broker for ${result.count} request${result.count === 1 ? "" : "s"}. Ready for individual payout processing.`,
  };
}
export async function adminRecordWithdrawalConversionBatch(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const withdrawalIds = formData
    .getAll("withdrawalIds")
    .map((value) => String(value))
    .filter(Boolean);
  const totalInrRaw = String(formData.get("totalInrReceived") ?? "");
  const totalInr = Number(totalInrRaw);
  if (withdrawalIds.length === 0) {
    return { error: "Select at least one withdrawal to convert." };
  }
  if (!Number.isFinite(totalInr) || totalInr <= 0) {
    return { error: "Enter the total INR received in the company bank account." };
  }

  let result;
  try {
    result = await recordWithdrawalConversionBatch(
      withdrawalIds,
      D(totalInrRaw),
    );
  } catch (err) {
    return fail(err);
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/app/withdraw");
  revalidatePath("/app/history");
  const method = result.method === "BANK" ? "bank transfer" : "cash";
  return {
    success: `${formatInr(result.totalInrReceived)} INR allocated across ${result.count} ${method} withdrawal${result.count === 1 ? "" : "s"}.`,
  };
}
export async function adminCompleteWithdrawalPayout(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const payoutReference = String(formData.get("payoutReference") ?? "");
  if (!id || !payoutReference.trim()) return { error: "Enter the payout reference." };
  try {
    await completeWithdrawalPayout(id, payoutReference);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/app/withdraw");
  revalidatePath("/app/history");
  return { success: "Payout completed." };
}

export async function adminUpdateWithdrawalRate(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const rate = Number(formData.get("rate") ?? 0);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1000) {
    return { error: "Enter a valid INR per USD reference rate." };
  }
  await prisma.setting.upsert({
    where: { key: "WITHDRAWAL_INR_PER_USD" },
    update: { value: String(rate) },
    create: { key: "WITHDRAWAL_INR_PER_USD", value: String(rate) },
  });
  revalidatePath("/admin/withdrawals");
  revalidatePath("/app/withdraw");
  revalidatePath("/app/history");
  return {
    success:
      "Reference rate updated. New bank and cash withdrawal estimates will use it.",
  };
}

export async function adminRejectWithdrawal(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    await rejectWithdrawal(id, String(formData.get("note") ?? "") || undefined);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/app/withdraw");
  revalidatePath("/app/history");
  return { success: "Withdrawal rejected." };
}

// --- KYC -------------------------------------------------------------------------

export async function adminKycDecision(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!userId || (decision !== "APPROVED" && decision !== "REJECTED")) return { error: "Invalid decision." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: decision,
      kycNote: note || null,
      ...(decision === "APPROVED"
        ? {
            bankTransferEnabled: formData.get("bankTransferEnabled") != null,
            cashEnabled: formData.get("cashEnabled") != null,
          }
        : {}),
    },
  });
  revalidatePath("/admin/kyc");
  revalidatePath("/admin");
  revalidatePath("/app/deposit");
  revalidatePath("/app/history");
  return { success: decision === "APPROVED" ? "KYC approved." : "KYC rejected." };
}

// --- Tickets ----------------------------------------------------------------------

export async function adminReplyTicket(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!ticketId || !body) return { error: "Reply cannot be empty." };

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "Ticket not found." };
  if (ticket.status === "CLOSED") return { error: "This ticket is closed." };

  const messageId = randomUUID();
  let attachments;
  try {
    attachments = await storeTicketAttachments(ticketId, messageId, ticketFilesFrom(formData));
  } catch (error) {
    return fail(error);
  }

  try {
    await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          id: messageId,
          ticketId,
          authorId: admin.id,
          body,
          isStaff: true,
          attachments: { create: attachments },
        },
      }),
      prisma.ticket.update({ where: { id: ticketId }, data: { status: "ANSWERED" } }),
    ]);
  } catch (error) {
    await removeStoredTicketAttachments(attachments);
    return fail(error);
  }
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/app/tickets/${ticketId}`);
  return { success: "Reply sent." };
}

export async function adminCloseTicket(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  if (!ticketId) return { error: "Ticket not found." };

  await prisma.ticket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { success: "Ticket closed." };
}

"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { D, formatInr } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
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
import { recordTradingAdjustment } from "@/lib/tradingAccount";
import { stageRequiredBankPayoutCorrections } from "@/lib/payoutDetails";

export type AdminFormState = { error?: string; success?: string };

function fail(err: unknown): AdminFormState {
  return { error: err instanceof Error ? err.message : "Something went wrong" };
}

// --- Manual trading account -------------------------------------------------

export async function adminRecordTradingAdjustment(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const type = String(formData.get("type") ?? "");
  const allowed = ["TRADING_PROFIT", "TRADING_LOSS", "SERVER_FEE", "ADMIN_SHARE", "OTHER_INCREASE", "OTHER_DECREASE"] as const;
  if (!allowed.includes(type as (typeof allowed)[number])) return { error: "Choose a valid reason." };
  try {
    await recordTradingAdjustment({
      type: type as (typeof allowed)[number],
      amount: D(String(formData.get("amount") ?? "")),
      note: String(formData.get("note") ?? ""),
      adminId: admin.id,
    });
    revalidatePath("/admin");
    revalidatePath("/app");
    return { success: "Trading account adjustment recorded." };
  } catch (error) {
    return fail(error);
  }
}
// --- Investor accounts ------------------------------------------------------

export async function adminUpdateInvestorProfile(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!userId || !email) return { error: "Investor and email are required." };

  const bankDetails = {
    accountNumber: String(formData.get("accountNumber") ?? "").trim() || null,
    ifsc: String(formData.get("ifsc") ?? "").trim().toUpperCase() || null,
    upiId: String(formData.get("upiId") ?? "").trim() || null,
    accountType: String(formData.get("accountType") ?? "").trim() || null,
  };
  let submittedForReview = 0;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId, role: "USER" },
        data: {
          email,
          fullName: String(formData.get("fullName") ?? "").trim() || null,
          mobile: String(formData.get("mobile") ?? "").trim() || null,
          country: String(formData.get("country") ?? "").trim() || null,
          address: String(formData.get("address") ?? "").trim() || null,
          city: String(formData.get("city") ?? "").trim() || null,
          state: String(formData.get("state") ?? "").trim() || null,
          kycStatus: String(formData.get("kycStatus") ?? "NOT_SUBMITTED") as "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED",
          kycNote: String(formData.get("kycNote") ?? "").trim() || null,
          bankTransferEnabled: formData.get("bankTransferEnabled") != null,
          cashEnabled: formData.get("cashEnabled") != null,
          bankingDetail: {
            upsert: {
              create: {
                ...bankDetails,
                usdtAddress: String(formData.get("usdtAddress") ?? "").trim() || null,
                usdtNetwork: String(formData.get("usdtNetwork") ?? "").trim() || null,
              },
              update: {
                ...bankDetails,
                usdtAddress: String(formData.get("usdtAddress") ?? "").trim() || null,
                usdtNetwork: String(formData.get("usdtNetwork") ?? "").trim() || null,
              },
            },
          },
        },
      });

      if (bankDetails.accountNumber && bankDetails.ifsc && bankDetails.accountType) {
        submittedForReview = await stageRequiredBankPayoutCorrections(tx, {
          userId,
          details: {
            accountNumber: bankDetails.accountNumber,
            ifsc: bankDetails.ifsc,
            upiId: bankDetails.upiId,
            accountType: bankDetails.accountType,
          },
          actorId: admin.id,
          actorRole: "ADMIN",
        });
      }
    });
    revalidatePath(`/admin/investors/${userId}`);
    revalidatePath("/admin/investors");
    revalidatePath("/admin/withdrawals");
    revalidatePath("/app/profile");
    revalidatePath("/app/history");
    revalidatePath("/app");
    return {
      success:
        submittedForReview > 0
          ? `Investor details updated. Corrected bank details were submitted for ${submittedForReview} held payout${submittedForReview === 1 ? "" : "s"}; approve them in Withdrawals.`
          : "Investor profile and financial details updated.",
    };
  } catch (error) {
    return fail(error);
  }
}
export async function adminResetInvestorPassword(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "The temporary password must be at least 8 characters." };
  try {
    await prisma.user.update({ where: { id: userId, role: "USER" }, data: { passwordHash: await bcrypt.hash(password, 12) } });
    return { success: "Password reset. Send the temporary password to the investor securely." };
  } catch (error) { return fail(error); }
}

export async function adminSetInvestorBalances(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Enter an audit note." };
  try {
    const targetQueued = D(String(formData.get("queued") ?? ""));
    const targetInvested = D(String(formData.get("invested") ?? ""));
    if (targetQueued.lt(0) || targetInvested.lt(0)) return { error: "Balances cannot be negative." };
    const navState = await getCurrentNav();
    if (navState.nav.lte(0)) return { error: "A positive NAV is required." };
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      const currentInvested = D(wallet.units).mul(navState.nav);
      const delta = targetInvested.sub(currentInvested);
      const targetUnits = targetInvested.div(navState.nav);
      const unitDelta = targetUnits.sub(D(wallet.units));
      const pool = await tx.poolState.findUniqueOrThrow({ where: { id: "pool" } });
      const newBalance = D(pool.tradingBalance).add(delta);
      const newEquity = newBalance;
      if (newBalance.lt(0) || newEquity.lt(0)) throw new Error("This correction would make the trading account negative.");
      await tx.wallet.update({ where: { id: wallet.id }, data: { queued: targetQueued, units: targetUnits } });
      await tx.poolState.update({ where: { id: "pool" }, data: { totalUnits: { increment: unitDelta }, tradingBalance: newBalance, tradingEquity: newEquity } });
      await tx.ledgerEntry.create({ data: { userId, type: "ADJUSTMENT", amount: delta.add(targetQueued.sub(D(wallet.queued))), units: unitDelta, navPrice: navState.nav, note } });
      if (!delta.eq(0)) await tx.tradingAccountEntry.create({ data: { type: delta.gt(0) ? "OTHER_INCREASE" : "OTHER_DECREASE", amount: delta, balanceBefore: pool.tradingBalance, balanceAfter: newBalance, equityBefore: pool.tradingBalance, equityAfter: newEquity, note: `Investor correction: ${note}`, adminId: admin.id } });
    });
    revalidatePath(`/admin/investors/${userId}`); revalidatePath("/admin/investors"); revalidatePath("/admin"); revalidatePath("/app");
    return { success: "Investor balances corrected and audited." };
  } catch (error) { return fail(error); }
}

export async function adminDeleteInvestor(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Investor not found." };
  try {
    const investor = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isCompanyAccount: true } });
    if (!investor || investor.role !== "USER" || investor.isCompanyAccount) return { error: "Only investor accounts can be deleted." };
    await prisma.$transaction(async (tx) => {
      await tx.internalTransfer.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } });
      await tx.profitShareAllocation.deleteMany({ where: { userId } });
      await tx.ticketMessage.deleteMany({ where: { authorId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });
    revalidatePath("/admin/investors"); revalidatePath("/admin");
    return { success: "Investor and all linked account data permanently deleted." };
  } catch (error) { return fail(error); }
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
      success: `${result.totalReceivedUsdt.toFixed(2)} USDT invested across ${result.allocations.length} deposit${result.allocations.length === 1 ? "" : "s"} at NAV ${result.investmentNav.toFixed(2)}. Transfer fees: ${transferFee.toFixed(2)} USDT.`,
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
  revalidatePath("/app", "layout");
  return { success: "Correction requested. The deposit cannot be credited until the investor resubmits the details." };
}

export async function adminEditDepositRecord(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  const statuses = ["PENDING", "NEEDS_CORRECTION", "RECEIVED", "QUEUED", "CONFIRMED", "REJECTED", "CANCELLED"] as const;
  if (!statuses.includes(status as (typeof statuses)[number])) return { error: "Invalid deposit status." };
  try {
    const amount = D(String(formData.get("amount") ?? ""));
    if (amount.lt(0)) return { error: "Deposit amount cannot be negative." };
    await prisma.deposit.update({ where: { id, userId }, data: { amount, status: status as (typeof statuses)[number], reference: String(formData.get("reference") ?? "").trim() || null, txHash: String(formData.get("txHash") ?? "").trim() || null, adminNote: String(formData.get("adminNote") ?? "").trim() || null } });
    revalidatePath(`/admin/investors/${userId}`); revalidatePath("/admin/deposits"); revalidatePath("/app/history");
    return { success: "Deposit record updated. Correct the investor balance separately if this changes credited value." };
  } catch (error) { return fail(error); }
}

export async function adminEditWithdrawalRecord(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  const statuses = ["REQUESTED", "APPROVED", "BROKER_RECEIVED", "INR_READY", "PAYOUT_DETAILS_REQUIRED", "PAYOUT_DETAILS_REVIEW", "PROCESSED", "REJECTED", "CANCELLED"] as const;
  if (!statuses.includes(status as (typeof statuses)[number])) return { error: "Invalid withdrawal status." };
  try {
    const amount = D(String(formData.get("amount") ?? ""));
    if (amount.lt(0)) return { error: "Withdrawal amount cannot be negative." };
    await prisma.withdrawal.update({ where: { id, userId }, data: { amount, status: status as (typeof statuses)[number], txHash: String(formData.get("reference") ?? "").trim() || null, adminNote: String(formData.get("adminNote") ?? "").trim() || null } });
    revalidatePath(`/admin/investors/${userId}`); revalidatePath("/admin/withdrawals"); revalidatePath("/app/history");
    return { success: "Withdrawal record updated. Correct the investor balance separately if this changes debited value." };
  } catch (error) { return fail(error); }
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
  return { success: "Bank and cash access updated for deposits and withdrawals." };
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
  const admin = await requireAdmin();
  const withdrawalIds = formData
    .getAll("withdrawalIds")
    .map((value) => String(value))
    .filter(Boolean);
  if (withdrawalIds.length === 0) {
    return { error: "Select at least one approved withdrawal." };
  }

  let result;
  try {
    result = await recordBrokerWithdrawalBatch(withdrawalIds, admin.id);
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
export async function adminRequestWithdrawalPayoutCorrection(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !note) return { error: "Explain what is wrong with the payout details." };

  try {
    await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUniqueOrThrow({ where: { id } });
      if (withdrawal.method !== "BANK" || withdrawal.status !== "INR_READY") {
        throw new Error("Only bank withdrawals ready for payout can request bank-detail correction.");
      }

      const updated = await tx.withdrawal.updateMany({
        where: { id, method: "BANK", status: "INR_READY" },
        data: {
          status: "PAYOUT_DETAILS_REQUIRED",
          payoutCorrectionNote: note,
          payoutCorrectionRequestedAt: new Date(),
          payoutDetailsSubmittedAt: null,
          proposedAccountNumber: null,
          proposedIfsc: null,
          proposedUpiId: null,
          proposedAccountType: null,
        },
      });
      if (updated.count !== 1) throw new Error("This payout is no longer ready for correction.");

      await tx.withdrawalPayoutDetailAudit.create({
        data: {
          withdrawalId: id,
          action: "CORRECTION_REQUESTED",
          actorId: admin.id,
          actorRole: "ADMIN",
          accountNumber: withdrawal.payoutAccountNumber,
          ifsc: withdrawal.payoutIfsc,
          upiId: withdrawal.payoutUpiId,
          accountType: withdrawal.payoutAccountType,
          note,
        },
      });
    });
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/app/profile");
  revalidatePath("/app/history");
  revalidatePath("/app");
  return { success: "Payout blocked. The investor has been asked to correct their bank details." };
}

export async function adminApproveWithdrawalPayoutDetails(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Withdrawal not found." };

  try {
    await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUniqueOrThrow({ where: { id } });
      if (withdrawal.method !== "BANK" || withdrawal.status !== "PAYOUT_DETAILS_REVIEW") {
        throw new Error("These payout details are no longer awaiting review.");
      }
      if (
        !withdrawal.proposedAccountNumber ||
        !withdrawal.proposedIfsc ||
        !withdrawal.proposedAccountType
      ) {
        throw new Error("The proposed bank destination is incomplete.");
      }

      const approvedAt = new Date();
      const updated = await tx.withdrawal.updateMany({
        where: { id, method: "BANK", status: "PAYOUT_DETAILS_REVIEW" },
        data: {
          status: "INR_READY",
          payoutAccountNumber: withdrawal.proposedAccountNumber,
          payoutIfsc: withdrawal.proposedIfsc,
          payoutUpiId: withdrawal.proposedUpiId,
          payoutAccountType: withdrawal.proposedAccountType,
          proposedAccountNumber: null,
          proposedIfsc: null,
          proposedUpiId: null,
          proposedAccountType: null,
          payoutDetailsApprovedAt: approvedAt,
        },
      });
      if (updated.count !== 1) throw new Error("These payout details changed before approval.");

      await tx.withdrawalPayoutDetailAudit.create({
        data: {
          withdrawalId: id,
          action: "DETAILS_APPROVED",
          actorId: admin.id,
          actorRole: "ADMIN",
          accountNumber: withdrawal.proposedAccountNumber,
          ifsc: withdrawal.proposedIfsc,
          upiId: withdrawal.proposedUpiId,
          accountType: withdrawal.proposedAccountType,
          note: withdrawal.payoutCorrectionNote,
        },
      });
    });
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/app/profile");
  revalidatePath("/app/history");
  revalidatePath("/app");
  return { success: "Corrected bank details approved. The withdrawal is ready for payout again." };
}

export async function adminRejectWithdrawalPayoutDetails(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id || !note) return { error: "Explain what still needs to be corrected." };

  try {
    await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUniqueOrThrow({ where: { id } });
      if (withdrawal.method !== "BANK" || withdrawal.status !== "PAYOUT_DETAILS_REVIEW") {
        throw new Error("These payout details are no longer awaiting review.");
      }

      await tx.withdrawalPayoutDetailAudit.create({
        data: {
          withdrawalId: id,
          action: "DETAILS_REJECTED",
          actorId: admin.id,
          actorRole: "ADMIN",
          accountNumber: withdrawal.proposedAccountNumber,
          ifsc: withdrawal.proposedIfsc,
          upiId: withdrawal.proposedUpiId,
          accountType: withdrawal.proposedAccountType,
          note,
        },
      });
      const updated = await tx.withdrawal.updateMany({
        where: { id, method: "BANK", status: "PAYOUT_DETAILS_REVIEW" },
        data: {
          status: "PAYOUT_DETAILS_REQUIRED",
          payoutCorrectionNote: note,
          payoutCorrectionRequestedAt: new Date(),
          payoutDetailsSubmittedAt: null,
          proposedAccountNumber: null,
          proposedIfsc: null,
          proposedUpiId: null,
          proposedAccountType: null,
        },
      });
      if (updated.count !== 1) throw new Error("These payout details changed before rejection.");
    });
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/app/profile");
  revalidatePath("/app/history");
  revalidatePath("/app");
  return { success: "Correction rejected. The payout remains blocked until the investor resubmits." };
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
  revalidatePath("/app", "layout");
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
  revalidatePath("/app", "layout");
  return { success: "Reply sent." };
}

export async function adminCloseTicket(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  if (!ticketId) return { error: "Ticket not found." };

  await prisma.ticket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath("/app", "layout");
  return { success: "Ticket closed." };
}

export async function adminReopenTicket(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  if (!ticketId) return { error: "Ticket not found." };

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.updateMany({
        where: { id: ticketId, status: "CLOSED" },
        data: { status: "OPEN" },
      });
      if (updated.count !== 1) {
        throw new Error("This ticket is not closed or no longer exists.");
      }

      await tx.ticketMessage.create({
        data: {
          id: randomUUID(),
          ticketId,
          authorId: admin.id,
          body: "Ticket reopened by staff.",
          isStaff: true,
        },
      });
    });
  } catch (error) {
    return fail(error);
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath("/admin");
  revalidatePath(`/app/tickets/${ticketId}`);
  revalidatePath("/app/tickets");
  return { success: "Ticket reopened." };
}

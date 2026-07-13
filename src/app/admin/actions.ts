"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { D } from "@/lib/money";
import {
  confirmDeposit,
  rejectDeposit,
  approveWithdrawal,
  processWithdrawal,
  rejectWithdrawal,
  runWeeklyInvest,
} from "@/lib/wallet";

export type AdminFormState = { error?: string; success?: string };

function fail(err: unknown): AdminFormState {
  return { error: err instanceof Error ? err.message : "Something went wrong" };
}

// --- Deposits ---------------------------------------------------------------

export async function adminConfirmDeposit(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const landed = Number(formData.get("landedAmount"));
  if (!id || !Number.isFinite(landed) || landed <= 0) return { error: "Enter the landed amount." };

  try {
    await confirmDeposit(id, D(landed), String(formData.get("note") ?? "") || undefined);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/deposits");
  revalidatePath("/admin");
  return { success: "Deposit confirmed and credited." };
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

// --- Withdrawals ------------------------------------------------------------

export async function adminApproveWithdrawal(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const fee = Number(formData.get("fee") ?? 0);
  if (!id || !Number.isFinite(fee) || fee < 0) return { error: "Enter a valid fee (0 or more)." };

  try {
    await approveWithdrawal(id, D(fee), String(formData.get("note") ?? "") || undefined);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  return { success: "Withdrawal approved." };
}

export async function adminProcessWithdrawal(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    await processWithdrawal(id, String(formData.get("txHash") ?? "") || undefined);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  return { success: "Withdrawal processed and ledgered." };
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
  return { success: "Withdrawal rejected." };
}

// --- Weekly invest run --------------------------------------------------------

export async function adminRunWeeklyInvest(_prev: AdminFormState, _formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  try {
    const result = await runWeeklyInvest();
    revalidatePath("/admin");
    return {
      success: `Invested ${result.invested.toFixed(2)} USDT across ${result.investors} investor(s) at NAV ${result.nav.toFixed(6)}.`,
    };
  } catch (err) {
    return fail(err);
  }
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
    data: { kycStatus: decision, kycNote: note || null },
  });
  revalidatePath("/admin/kyc");
  revalidatePath("/admin");
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

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId, authorId: admin.id, body, isStaff: true },
    }),
    prisma.ticket.update({ where: { id: ticketId }, data: { status: "ANSWERED" } }),
  ]);
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
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

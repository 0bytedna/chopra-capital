import "server-only";

import { cache } from "react";
import { NETWORKS } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export type UserNotificationKind = "ACTION" | "UPDATE" | "RECOMMENDATION";

export type UserNotification = {
  id: string;
  kind: UserNotificationKind;
  title: string;
  message: string;
  href: string;
  actionLabel: string;
};

export type UserNotificationCenter = {
  actionItems: UserNotification[];
  updates: UserNotification[];
  recommendations: UserNotification[];
  attentionCount: number;
};

function isFilled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export const getUserNotificationCenter = cache(
  async (userId: string): Promise<UserNotificationCenter> => {
    const [user, depositCorrections, withdrawalItems, answeredTickets] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          kycStatus: true,
          kycNote: true,
          twoFactorEnabled: true,
          bankingDetail: {
            select: {
              accountNumber: true,
              ifsc: true,
              accountType: true,
              usdtAddress: true,
              usdtNetwork: true,
            },
          },
        },
      }),
      prisma.deposit.findMany({
        where: { userId, status: "NEEDS_CORRECTION" },
        select: { adminNote: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.withdrawal.findMany({
        where: {
          userId,
          status: { in: ["PAYOUT_DETAILS_REQUIRED", "PAYOUT_DETAILS_REVIEW"] },
        },
        select: { status: true, payoutCorrectionNote: true },
        orderBy: { payoutCorrectionRequestedAt: "desc" },
      }),
      prisma.ticket.findMany({
        where: { userId, status: "ANSWERED" },
        select: { id: true, subject: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    if (!user) {
      return { actionItems: [], updates: [], recommendations: [], attentionCount: 0 };
    }

    const actionItems: UserNotification[] = [];
    const updates: UserNotification[] = [];
    const recommendations: UserNotification[] = [];
    let attentionCount = 0;

    if (user.kycStatus === "NOT_SUBMITTED") {
      attentionCount += 1;
      actionItems.push({
        id: "kyc-not-submitted",
        kind: "ACTION",
        title: "Complete identity verification",
        message: "KYC approval is required before you can deposit or withdraw funds.",
        href: "/app/profile#kyc-verification",
        actionLabel: "Complete KYC",
      });
    } else if (user.kycStatus === "REJECTED") {
      attentionCount += 1;
      actionItems.push({
        id: "kyc-rejected",
        kind: "ACTION",
        title: "KYC documents need attention",
        message:
          user.kycNote?.trim() ||
          "Your identity documents were not approved. Review the request and submit corrected documents.",
        href: "/app/profile#kyc-verification",
        actionLabel: "Correct KYC",
      });
    } else if (user.kycStatus === "PENDING") {
      updates.push({
        id: "kyc-pending",
        kind: "UPDATE",
        title: "KYC is under review",
        message: "Your documents have been submitted. We will update your status after review.",
        href: "/app/profile#kyc-verification",
        actionLabel: "View status",
      });
    }

    if (depositCorrections.length > 0) {
      attentionCount += depositCorrections.length;
      const note = depositCorrections[0]?.adminNote?.trim();
      actionItems.push({
        id: "deposit-corrections",
        kind: "ACTION",
        title: `${depositCorrections.length} deposit request${depositCorrections.length === 1 ? "" : "s"} need correction`,
        message: note || "The operations team needs corrected payment information before verification.",
        href: "/app/history",
        actionLabel: "Review deposits",
      });
    }

    const payoutCorrections = withdrawalItems.filter(
      (item) => item.status === "PAYOUT_DETAILS_REQUIRED",
    );
    const payoutReviews = withdrawalItems.filter(
      (item) => item.status === "PAYOUT_DETAILS_REVIEW",
    );

    if (payoutCorrections.length > 0) {
      attentionCount += payoutCorrections.length;
      const note = payoutCorrections[0]?.payoutCorrectionNote?.trim();
      actionItems.push({
        id: "payout-detail-corrections",
        kind: "ACTION",
        title: `${payoutCorrections.length} withdrawal payout${payoutCorrections.length === 1 ? "" : "s"} on hold`,
        message:
          note ||
          "Correct your bank details so the operations team can continue processing the payout.",
        href: "/app/profile#banking-details",
        actionLabel: "Correct bank details",
      });
    }

    if (payoutReviews.length > 0) {
      updates.push({
        id: "payout-details-review",
        kind: "UPDATE",
        title: "Corrected payout details are under review",
        message: `${payoutReviews.length} withdrawal payout${payoutReviews.length === 1 ? " is" : "s are"} safely on hold until an admin approves the new destination.`,
        href: "/app/history",
        actionLabel: "View withdrawals",
      });
    }

    for (const ticket of answeredTickets) {
      attentionCount += 1;
      actionItems.push({
        id: `ticket-${ticket.id}`,
        kind: "ACTION",
        title: `Support replied: ${ticket.subject}`,
        message: "A support reply is waiting for you.",
        href: `/app/tickets/${ticket.id}`,
        actionLabel: "Read reply",
      });
    }

    const banking = user.bankingDetail;
    if (
      !isFilled(banking?.accountNumber) ||
      !isFilled(banking?.ifsc) ||
      !isFilled(banking?.accountType)
    ) {
      recommendations.push({
        id: "bank-details-missing",
        kind: "RECOMMENDATION",
        title: "Add bank payout details",
        message: "Bank account number, IFSC, and account type are required for bank withdrawals.",
        href: "/app/profile#banking-details",
        actionLabel: "Add bank details",
      });
    }

    if (
      !isFilled(banking?.usdtAddress) ||
      !banking?.usdtNetwork ||
      !(NETWORKS as readonly string[]).includes(banking.usdtNetwork)
    ) {
      recommendations.push({
        id: "crypto-wallet-missing",
        kind: "RECOMMENDATION",
        title: "Add a crypto payout wallet",
        message: "A USDT address and network are required for crypto withdrawals.",
        href: "/app/profile#crypto-wallet",
        actionLabel: "Add crypto wallet",
      });
    }

    if (!user.twoFactorEnabled) {
      recommendations.push({
        id: "two-factor-disabled",
        kind: "RECOMMENDATION",
        title: "Protect withdrawals with 2FA",
        message: "Enable an authenticator app to require a security code when withdrawing funds.",
        href: "/app/profile#two-factor-security",
        actionLabel: "Enable 2FA",
      });
    }

    return { actionItems, updates, recommendations, attentionCount };
  },
);

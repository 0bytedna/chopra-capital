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
  isUnread?: boolean;
  occurredAt?: Date;
};

export type UserJourneyStepState = "COMPLETE" | "CURRENT" | "UPCOMING";

export type UserJourneyStep = {
  id: "kyc" | "deposit" | "withdraw";
  title: string;
  message: string;
  href: string;
  actionLabel: string;
  state: UserJourneyStepState;
};

export type UserNotificationCenter = {
  journey: UserJourneyStep[];
  actionItems: UserNotification[];
  updates: UserNotification[];
  recommendations: UserNotification[];
  urgentCount: number;
  unreadCount: number;
  attentionCount: number;
};

function isFilled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export const getUserNotificationCenter = cache(
  async (userId: string): Promise<UserNotificationCenter> => {
    const [user, depositCorrections, withdrawalItems, accountNotifications, unreadCount] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            kycStatus: true,
            kycNote: true,
            twoFactorEnabled: true,
            wallet: { select: { units: true } },
            deposits: {
              where: { status: { notIn: ["REJECTED", "CANCELLED"] } },
              select: { id: true },
              take: 1,
            },
            withdrawals: {
              where: { status: { notIn: ["REJECTED", "CANCELLED"] } },
              select: { id: true },
              take: 1,
            },
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
          where: { userId, status: "PAYOUT_DETAILS_REQUIRED" },
          select: { payoutCorrectionNote: true },
          orderBy: { payoutCorrectionRequestedAt: "desc" },
        }),
        prisma.accountNotification.findMany({
          where: { userId },
          select: {
            id: true,
            kind: true,
            title: true,
            message: true,
            href: true,
            actionLabel: true,
            isRead: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 100,
        }),
        prisma.accountNotification.count({ where: { userId, isRead: false } }),
      ]);

    if (!user) {
      return {
        journey: [],
        actionItems: [],
        updates: [],
        recommendations: [],
        urgentCount: 0,
        unreadCount: 0,
        attentionCount: 0,
      };
    }

    const actionItems: UserNotification[] = [];
    const updates: UserNotification[] = accountNotifications.map((notification) => ({
      id: `account-${notification.id}`,
      kind: notification.kind === "ACTION" ? "ACTION" : "UPDATE",
      title: notification.title,
      message: notification.message,
      href: notification.href,
      actionLabel: notification.actionLabel,
      isUnread: !notification.isRead,
      occurredAt: notification.createdAt,
    }));
    const recommendations: UserNotification[] = [];
    let urgentCount = 0;

    if (user.kycStatus === "NOT_SUBMITTED") {
      urgentCount += 1;
      actionItems.push({
        id: "kyc-not-submitted",
        kind: "ACTION",
        title: "Complete identity verification",
        message: "KYC approval is required before you can deposit or withdraw funds.",
        href: "/app/profile#kyc-verification",
        actionLabel: "Complete KYC",
      });
    } else if (user.kycStatus === "REJECTED") {
      urgentCount += 1;
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
    }

    const kycApproved = user.kycStatus === "APPROVED";
    const hasDeposit = user.deposits.length > 0;
    const hasWithdrawal = user.withdrawals.length > 0;
    const hasInvestedBalance = (user.wallet?.units.toNumber() ?? 0) > 0;

    const journey: UserJourneyStep[] = [
      {
        id: "kyc",
        title: "Complete KYC",
        message: kycApproved
          ? "Your identity verification is approved."
          : user.kycStatus === "PENDING"
            ? "Your documents are under review. We will notify you when a decision is made."
            : user.kycStatus === "REJECTED"
              ? "Correct the requested documents and resubmit them for approval."
              : "Verify your identity to unlock deposits and withdrawals.",
        href: "/app/profile#kyc-verification",
        actionLabel: kycApproved
          ? "View KYC"
          : user.kycStatus === "PENDING"
            ? "View status"
            : user.kycStatus === "REJECTED"
              ? "Correct KYC"
              : "Complete KYC",
        state: kycApproved ? "COMPLETE" : "CURRENT",
      },
      {
        id: "deposit",
        title: "Deposit funds",
        message: hasDeposit
          ? "Your first deposit has been submitted. Follow its progress in History."
          : kycApproved
            ? "KYC is approved. Choose crypto, bank transfer, or cash to add funds."
            : "This step unlocks after KYC approval.",
        href: hasDeposit ? "/app/history" : "/app/deposit",
        actionLabel: hasDeposit ? "Track deposits" : "Deposit funds",
        state: hasDeposit ? "COMPLETE" : kycApproved ? "CURRENT" : "UPCOMING",
      },
      {
        id: "withdraw",
        title: "Withdraw funds",
        message: hasWithdrawal
          ? "You have submitted a withdrawal and can follow its progress in History."
          : hasInvestedBalance
            ? "When needed, choose a payout method and submit a withdrawal request."
            : "This step becomes available after funds are invested and a balance is available.",
        href: hasWithdrawal ? "/app/history" : "/app/withdraw",
        actionLabel: hasWithdrawal ? "Track withdrawals" : "View withdrawals",
        state: hasWithdrawal
          ? "COMPLETE"
          : hasInvestedBalance
            ? "CURRENT"
            : "UPCOMING",
      },
    ];

    if (depositCorrections.length > 0) {
      urgentCount += depositCorrections.length;
      const note = depositCorrections[0]?.adminNote?.trim();
      actionItems.push({
        id: "deposit-corrections",
        kind: "ACTION",
        title: `${depositCorrections.length} deposit request${depositCorrections.length === 1 ? "" : "s"} need correction`,
        message:
          note || "The operations team needs corrected payment information before verification.",
        href: "/app/history",
        actionLabel: "Review deposits",
      });
    }

    if (withdrawalItems.length > 0) {
      urgentCount += withdrawalItems.length;
      const note = withdrawalItems[0]?.payoutCorrectionNote?.trim();
      actionItems.push({
        id: "payout-detail-corrections",
        kind: "ACTION",
        title: `${withdrawalItems.length} withdrawal payout${withdrawalItems.length === 1 ? "" : "s"} on hold`,
        message:
          note ||
          "Correct your bank details so the operations team can continue processing the payout.",
        href: "/app/profile#banking-details",
        actionLabel: "Correct bank details",
      });
    }

    const banking = user.bankingDetail;
    if (
      kycApproved &&
      hasInvestedBalance &&
      (!isFilled(banking?.accountNumber) ||
        !isFilled(banking?.ifsc) ||
        !isFilled(banking?.accountType))
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
      kycApproved &&
      hasInvestedBalance &&
      (!isFilled(banking?.usdtAddress) ||
        !banking?.usdtNetwork ||
        !(NETWORKS as readonly string[]).includes(banking.usdtNetwork))
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

    return {
      journey,
      actionItems,
      updates,
      recommendations,
      urgentCount,
      unreadCount,
      attentionCount: urgentCount + unreadCount,
    };
  },
);
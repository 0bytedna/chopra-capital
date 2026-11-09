import type { BankingDetail, User } from "@prisma/client";
import { NETWORKS } from "@/lib/config";

type EligibilityUser = Pick<User, "kycStatus" | "withdrawalBankEnabled" | "withdrawalCryptoEnabled" | "withdrawalCashEnabled">;

type EligibilityBanking = Pick<
  BankingDetail,
  "accountNumber" | "ifsc" | "accountType" | "usdtAddress" | "usdtNetwork"
>;

export type FinancialRestriction = {
  title: string;
  message: string;
};

export type FinancialEligibility = {
  eligible: boolean;
  restriction: FinancialRestriction | null;
};

export type WithdrawalMethod = "CRYPTO" | "BANK" | "CASH";

function isFilled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function getKycEligibility(user: EligibilityUser): FinancialEligibility {
  if (user.kycStatus !== "APPROVED") {
    const message =
      user.kycStatus === "PENDING"
        ? "Your KYC verification is still under review. Deposits and withdrawals will be enabled after it is approved."
        : user.kycStatus === "REJECTED"
          ? "Your KYC verification was not approved. Resubmit the requested documents in Profile & Security before depositing or withdrawing funds."
          : "Complete KYC verification in Profile & Security before depositing or withdrawing funds.";

    return {
      eligible: false,
      restriction: { title: "KYC verification required", message },
    };
  }

  return { eligible: true, restriction: null };
}

export function getDepositEligibility(user: EligibilityUser): FinancialEligibility {
  const kycEligibility = getKycEligibility(user);
  if (!kycEligibility.eligible) return kycEligibility;
  return { eligible: true, restriction: null };
}

export function getWithdrawalEligibility(
  user: EligibilityUser,
  banking: EligibilityBanking | null,
  method: WithdrawalMethod,
): FinancialEligibility {
  const kycEligibility = getKycEligibility(user);
  if (!kycEligibility.eligible) return kycEligibility;

  if (method === "CRYPTO" && !user.withdrawalCryptoEnabled) {
    return { eligible: false, restriction: { title: "Crypto unavailable", message: "Crypto transactions are not enabled on your account. Contact support." } };
  }

  if (method === "BANK" && !user.withdrawalBankEnabled) {
    return {
      eligible: false,
      restriction: {
        title: "Bank transfer unavailable",
        message: "Bank transfer is not enabled on your account. Contact support if you need this deposit or withdrawal method.",
      },
    };
  }

  if (method === "CASH" && !user.withdrawalCashEnabled) {
    return {
      eligible: false,
      restriction: {
        title: "Cash unavailable",
        message: "Cash is not enabled on your account. Contact support if you need this deposit or withdrawal method.",
      },
    };
  }

  if (
    method === "BANK" &&
    (!isFilled(banking?.accountNumber) || !isFilled(banking?.ifsc) || !isFilled(banking?.accountType))
  ) {
    return {
      eligible: false,
      restriction: {
        title: "Bank details required",
        message:
          "Add your bank account number, IFSC, and account type in Profile & Security before requesting a bank withdrawal.",
      },
    };
  }

  if (
    method === "CRYPTO" &&
    (!isFilled(banking?.usdtAddress) ||
      !banking?.usdtNetwork ||
      !(NETWORKS as readonly string[]).includes(banking.usdtNetwork))
  ) {
    return {
      eligible: false,
      restriction: {
        title: "Crypto wallet required",
        message:
          "Add your USDT wallet address and network in Profile & Security before requesting a crypto withdrawal.",
      },
    };
  }

  return { eligible: true, restriction: null };
}

import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/Alert";
import {
  ProfileDetailsForm,
  KycForm,
  BankingForm,
  CryptoWalletForm,
  TotpSection,
  PasswordForm,
} from "./ProfileForms";

export const metadata: Metadata = { title: "Profile & security" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [banking, payoutCorrections] = await Promise.all([
    prisma.bankingDetail.findUnique({ where: { userId: user.id } }),
    prisma.withdrawal.findMany({
      where: {
        userId: user.id,
        method: "BANK",
        status: { in: ["PAYOUT_DETAILS_REQUIRED", "PAYOUT_DETAILS_REVIEW"] },
      },
      select: { id: true, status: true, payoutCorrectionNote: true },
      orderBy: { payoutCorrectionRequestedAt: "desc" },
    }),
  ]);
  const correctionsRequired = payoutCorrections.filter(
    (withdrawal) => withdrawal.status === "PAYOUT_DETAILS_REQUIRED",
  );
  const correctionsInReview = payoutCorrections.filter(
    (withdrawal) => withdrawal.status === "PAYOUT_DETAILS_REVIEW",
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">
          Profile & <em className="gold-text italic">security</em>
        </h1>
      </header>

      <section className="glass-card rounded-2xl p-4 sm:p-7">
        <h2 className="font-serif text-xl text-ink">Personal details</h2>
        <p className="mt-1 text-xs text-ink-faint">{user.email}</p>
        <div className="mt-5">
          <ProfileDetailsForm
            fullName={user.fullName ?? ""}
            mobile={user.mobile ?? ""}
            email={user.email}
            address={user.address ?? ""}
            city={user.city ?? ""}
            stateField={user.state ?? ""}
            country={user.country ?? ""}
          />
        </div>
      </section>

      <section id="kyc-verification" className="glass-card scroll-mt-24 rounded-2xl p-4 sm:p-7">
        <h2 className="font-serif text-xl text-ink">Identity verification (KYC)</h2>
        <div className="mt-4 space-y-4">
          {user.kycStatus === "APPROVED" && (
            <Alert tone="success">Your identity is verified. Deposits are enabled.</Alert>
          )}
          {user.kycStatus === "PENDING" && (
            <Alert tone="warning">Your documents are in review. We&apos;ll update your status shortly.</Alert>
          )}
          {user.kycStatus === "REJECTED" && (
            <Alert tone="error">
              Your submission was rejected{user.kycNote ? `: ${user.kycNote}` : ""}. Please submit
              new documents below.
            </Alert>
          )}
          {(user.kycStatus === "NOT_SUBMITTED" || user.kycStatus === "REJECTED") && <KycForm />}
        </div>
      </section>

      <section id="banking-details" className="glass-card scroll-mt-6 rounded-2xl p-4 sm:p-7">
        <h2 className="font-serif text-xl text-ink">Banking details</h2>
        <p className="mt-1 text-xs text-ink-faint">
          Required only when you choose bank transfer for a withdrawal.
        </p>
        {correctionsRequired.length > 0 && (
          <Alert tone="warning" className="mt-4">
            {correctionsRequired.length === 1 ? "A bank payout is" : `${correctionsRequired.length} bank payouts are`} on hold because the saved destination needs correction
            {correctionsRequired[0]?.payoutCorrectionNote
              ? `: ${correctionsRequired[0].payoutCorrectionNote}`
              : "."} Update the details below and save them for admin review.
          </Alert>
        )}
        {correctionsInReview.length > 0 && (
          <Alert tone="warning" className="mt-4">
            Your corrected bank details are awaiting admin approval. The affected payout remains blocked until approval.
          </Alert>
        )}
        <div className="mt-5">
          <BankingForm
            twoFactorEnabled={user.twoFactorEnabled}
            initial={{
              accountNumber: banking?.accountNumber ?? "",
              ifsc: banking?.ifsc ?? "",
              upiId: banking?.upiId ?? "",
              accountType: banking?.accountType ?? "SAVINGS",
            }}
          />
        </div>
      </section>

      <section id="crypto-wallet" className="glass-card scroll-mt-24 rounded-2xl p-4 sm:p-7">
        <h2 className="font-serif text-xl text-ink">Crypto wallet</h2>
        <p className="mt-1 text-xs text-ink-faint">
          Required only when you choose crypto for a withdrawal.
        </p>
        <div className="mt-5">
          <CryptoWalletForm
            initial={{
              usdtAddress: banking?.usdtAddress ?? "",
              usdtNetwork: banking?.usdtNetwork ?? "TRC20",
            }}
          />
        </div>
      </section>

      <section id="two-factor-security" className="glass-card scroll-mt-24 rounded-2xl p-4 sm:p-7">
        <h2 className="font-serif text-xl text-ink">Two-factor authentication</h2>
        <div className="mt-4">
          <TotpSection enabled={user.twoFactorEnabled} />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4 sm:p-7">
        <h2 className="font-serif text-xl text-ink">Password</h2>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}

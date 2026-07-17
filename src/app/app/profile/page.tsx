import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/Alert";
import { ProfileDetailsForm, KycForm, BankingForm, TotpSection, PasswordForm } from "./ProfileForms";

export const metadata: Metadata = { title: "Profile & security" };

export default async function ProfilePage() {
  const user = await requireUser();
  const banking = await prisma.bankingDetail.findUnique({ where: { userId: user.id } });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Profile & <em className="gold-text italic">security</em>
        </h1>
      </header>

      <section className="glass-card rounded-2xl p-5 sm:p-7">
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

      <section className="glass-card rounded-2xl p-5 sm:p-7">
        <h2 className="font-serif text-xl text-ink">Identity verification (KYC)</h2>
        <div className="mt-4 space-y-4">
          {user.kycStatus === "APPROVED" && (
            <Alert tone="success">Your identity is verified — you can deposit and invest.</Alert>
          )}
          {user.kycStatus === "PENDING" && (
            <Alert tone="warning">Your documents are in review. We'll update your status shortly.</Alert>
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

      <section className="glass-card rounded-2xl p-5 sm:p-7">
        <h2 className="font-serif text-xl text-ink">Financial details</h2>
        <p className="mt-1 text-xs text-ink-faint">
          Banking information used for payouts and withdrawals.
        </p>
        <div className="mt-5">
          <BankingForm
            initial={{
              accountNumber: banking?.accountNumber ?? "",
              ifsc: banking?.ifsc ?? "",
              upiId: banking?.upiId ?? "",
              accountType: banking?.accountType ?? "SAVINGS",
              usdtAddress: banking?.usdtAddress ?? "",
              usdtNetwork: banking?.usdtNetwork ?? "TRC20",
            }}
          />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-7">
        <h2 className="font-serif text-xl text-ink">Two-factor authentication</h2>
        <div className="mt-4">
          <TotpSection enabled={user.twoFactorEnabled} />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-7">
        <h2 className="font-serif text-xl text-ink">Password</h2>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}

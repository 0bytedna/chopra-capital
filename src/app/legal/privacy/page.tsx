import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <>
      <p className="eyebrow">Legal</p>
      <h1>Privacy policy</h1>
      <p className="lead">What we collect, why we collect it, and how it is protected.</p>

      <h2>What we collect</h2>
      <ul>
        <li>Account data: name, email address, and your password stored as a one-way hash.</li>
        <li>Contact details you choose to add, such as mobile number and country.</li>
        <li>KYC documents: identity document and selfie, used solely for verification.</li>
        <li>Transaction data: deposits, withdrawals, allocations and your account ledger.</li>
        <li>Security data: two-factor authentication settings and session tokens.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To operate your account: balances, allocations, withdrawals and statements.</li>
        <li>To meet legal obligations, including identity verification and record-keeping.</li>
        <li>To secure the platform, prevent fraud and respond to support requests.</li>
      </ul>
      <p>We do not sell your personal data, and we do not use it for third-party advertising.</p>

      <h2>Storage and protection</h2>
      <p>
        Passwords are hashed with bcrypt and never stored in plain text. Sessions use signed,
        httpOnly cookies. KYC documents are stored outside the public web root and are accessible
        only to authorised staff. Access to production systems is restricted and logged.
      </p>

      <h2>Retention</h2>
      <p>
        We retain account and transaction records for as long as required by applicable
        financial-services and anti-money-laundering regulations, after which they are deleted or
        irreversibly anonymised.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request a copy of the personal data we hold about you, ask us to correct
        inaccurate data, or — subject to our legal retention obligations — request deletion.
        Contact support through your account to exercise these rights.
      </p>
    </>
  );
}

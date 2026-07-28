import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <>
      <p className="eyebrow">Legal</p>
      <h1>Terms of service</h1>
      <p className="lead">
        These terms govern your use of the Chopra Capital platform and your participation in the
        pooled gold strategy.
      </p>

      <h2>1. The service</h2>
      <p>
        Chopra Capital operates a pooled, professionally managed gold trading strategy. Investor
        funds are converted into pool units at the prevailing net asset value (NAV). NAV is
        derived from the equity of the pooled trading account divided by the total units in
        issue. Your holding at any time equals your units multiplied by the prevailing NAV, plus
        any unallocated (queued) balance.
      </p>

      <h2>2. Eligibility and verification</h2>
      <p>
        You must be of legal age in your jurisdiction and complete identity verification (KYC)
        before funds can be allocated to the pool. We may decline or reverse a registration at
        our discretion and may request updated documents at any time.
      </p>

      <h2>3. Deposits</h2>
      <p>
        Deposits are accepted in USDT on the supported networks shown in your account. Deposits
        must be greater than zero and are credited after on-chain confirmation by our team.
        They join the pool on the next weekly allocation run. Funds sent on unsupported networks
        or to incorrect addresses may be unrecoverable.
      </p>

      <h2>4. Withdrawals</h2>
      <p>
        Withdrawal requests are submitted on Sundays from 12:00 AM to 12:00 PM IST and processed on Mondays at the prevailing
        NAV. There is no lock-in period. Processing fees, where applied, are shown on your ledger
        as separate line items. Payouts are made in USDT to the address you provide; you are
        responsible for its accuracy.
      </p>

      <h2>5. Fees</h2>
      <p>
        Applicable fees are disclosed within the platform before you commit and are recorded as
        individual entries on your account ledger. We do not adjust NAV figures to embed hidden
        charges.
      </p>

      <h2>6. Risk</h2>
      <p>
        Investing through the platform puts your capital at risk. Performance objectives are
        targets, not guarantees. You should read the{" "}
        <Link href="/legal/risk" className="text-gold-400 underline decoration-gold-600/40 underline-offset-2">
          risk disclosure
        </Link>{" "}
        in full before depositing.
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        You agree not to use the platform for money laundering, sanctions evasion or any unlawful
        purpose, and to provide accurate information at all times. We may suspend accounts pending
        investigation and report where required by law.
      </p>

      <h2>8. Changes and termination</h2>
      <p>
        We may amend these terms with notice through the platform. If you do not accept an
        amendment you may withdraw your funds through the normal weekly cycle before it takes
        effect.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by applicable law. Any dispute is subject to the courts with
        jurisdiction over Chopra Capital&apos;s registered place of business.
      </p>
    </>
  );
}

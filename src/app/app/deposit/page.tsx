import type { Metadata } from "next";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import {
  depositAddress,
  bankDepositDetails,
  cashDepositInstruction,
} from "@/lib/config";
import { getDepositEligibility } from "@/lib/financialEligibility";
import { DepositForm } from "./DepositForm";

export const metadata: Metadata = { title: "Deposit" };

export default async function DepositPage() {
  const user = await requireUser();
  const addresses = {
    TRC20: depositAddress("TRC20"),
    ERC20: depositAddress("ERC20"),
    BEP20: depositAddress("BEP20"),
  };
  const [trc20Qr, erc20Qr, bep20Qr] = await Promise.all(
    (["TRC20", "ERC20", "BEP20"] as const).map((network) =>
      addresses[network]
        ? QRCode.toDataURL(addresses[network], { errorCorrectionLevel: "M", margin: 1, width: 160 })
        : Promise.resolve(""),
    ),
  );
  const qrCodes = { TRC20: trc20Qr, ERC20: erc20Qr, BEP20: bep20Qr };
  const eligibility = getDepositEligibility(user);

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <p className="eyebrow">Money in</p>
        <h1 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">
          Deposit <em className="gold-text italic">funds</em>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Choose a method, send the funds, and submit the payment reference for verification.
        </p>
      </header>

      <section className="glass-card rounded-2xl p-4 sm:p-7">
        <DepositForm
          addresses={addresses}
          qrCodes={qrCodes}
          restriction={eligibility.restriction}
          bankEnabled={user.bankTransferEnabled}
          cashEnabled={user.cashEnabled}
          bank={bankDepositDetails()}
          cashInstruction={cashDepositInstruction}
        />
      </section>

    </div>
  );
}

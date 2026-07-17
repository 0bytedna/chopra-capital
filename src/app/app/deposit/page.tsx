import type { Metadata } from "next";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  depositAddress,
  bankDepositDetails,
  cashDepositInstruction,
  MIN_DEPOSIT_USDT,
} from "@/lib/config";
import { formatInr, formatUsdt } from "@/lib/money";
import { DepositForm } from "./DepositForm";
import { DepositHistory } from "./DepositHistory";

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
  const deposits = await prisma.deposit.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="eyebrow">Money in</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Deposit <em className="gold-text italic">funds</em>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Choose crypto, bank transfer, or cash. Confirmed deposits are credited in USDT and allocated
          to the pool on the next weekly invest run. Capital at risk — returns are not guaranteed.
        </p>
      </header>

      <section className="glass-card rounded-2xl p-5 sm:p-7">
        <DepositForm
          addresses={addresses}
          qrCodes={qrCodes}
          minDeposit={MIN_DEPOSIT_USDT}
          kycApproved={user.kycStatus === "APPROVED"}
          bankEnabled={user.bankTransferEnabled}
          cashEnabled={user.cashEnabled}
          bank={bankDepositDetails()}
          cashInstruction={cashDepositInstruction}
        />
      </section>

      <section>
        <p className="eyebrow">History</p>
        <h2 className="mt-2 font-serif text-xl text-ink">Your deposits</h2>
        <DepositHistory
          deposits={deposits.map((d) => ({
            id: d.id,
            method: d.method,
            status: d.status,
            amount: formatUsdt(d.amount),
            inrAmount: d.inrAmount === null ? null : formatInr(d.inrAmount),
            editAmount: d.amount.toString(),
            editInrAmount: d.inrAmount?.toString() ?? null,
            network: d.network,
            txHash: d.txHash,
            reference: d.reference,
            adminNote: d.adminNote,
            createdAt: d.createdAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}

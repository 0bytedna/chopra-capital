import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentNav } from "@/lib/nav";
import { D, toNumber, formatUsdt } from "@/lib/money";
import { DepositMethodsToggle } from "@/components/admin/DepositMethodsToggle";

export const metadata: Metadata = { title: "Admin · Investors" };

export default async function AdminInvestorsPage() {
  const [users, { nav, totalUnits }] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { wallet: true },
    }),
    getCurrentNav(),
  ]);

  const totalUnitsNum = toNumber(totalUnits);

  const rows = users.map((u) => {
    const units = D(u.wallet?.units ?? 0);
    const queued = toNumber(u.wallet?.queued ?? 0);
    const value = toNumber(units.mul(nav));
    const share = totalUnitsNum > 0 ? (toNumber(units) / totalUnitsNum) * 100 : 0;
    return {
      id: u.id,
      name: u.fullName ?? "—",
      email: u.email,
      role: u.role,
      kyc: u.kycStatus,
      units: toNumber(units),
      queued,
      value,
      share,
      bankEnabled: u.bankTransferEnabled,
      cashEnabled: u.cashEnabled,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="eyebrow">Register</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Investor <em className="gold-text italic">register</em>
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          {rows.length} account(s) · pool NAV {formatUsdt(nav, 6)} USDT/unit
        </p>
      </header>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="glass-card rounded-xl p-4">
            <p className="truncate text-sm text-ink">{r.name}</p>
            <p className="truncate text-xs text-ink-faint">{r.email}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs text-ink-dim">
              <dt className="text-ink-faint">Units</dt>
              <dd className="text-right">{r.units.toFixed(4)}</dd>
              <dt className="text-ink-faint">Value</dt>
              <dd className="text-right">{formatUsdt(r.value)}</dd>
              <dt className="text-ink-faint">Queued</dt>
              <dd className="text-right">{formatUsdt(r.queued)}</dd>
              <dt className="text-ink-faint">Share</dt>
              <dd className="text-right">{r.share.toFixed(2)}%</dd>
            </dl>
            <div className="mt-4 border-t border-gold-600/10 pt-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-ink-faint">Deposit methods</p>
              <DepositMethodsToggle userId={r.id} bankEnabled={r.bankEnabled} cashEnabled={r.cashEnabled} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="glass-card hidden overflow-hidden rounded-2xl md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-600/15 text-left">
              {["Investor", "KYC", "Units", "Queued", "Value (USDT)", "Share", "Deposit methods"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gold-600/8 last:border-0">
                <td className="px-5 py-3.5">
                  <p className="text-ink">{r.name}{r.role === "ADMIN" ? " · staff" : ""}</p>
                  <p className="text-xs text-ink-faint">{r.email}</p>
                </td>
                <td className="px-5 py-3.5 text-xs text-ink-dim">{r.kyc.toLowerCase().replace("_", " ")}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{r.units.toFixed(4)}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{formatUsdt(r.queued)}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-gold-300">{formatUsdt(r.value)}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{r.share.toFixed(2)}%</td>
                <td className="px-5 py-3.5">
                  <DepositMethodsToggle userId={r.id} bankEnabled={r.bankEnabled} cashEnabled={r.cashEnabled} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

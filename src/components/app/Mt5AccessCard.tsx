"use client";

import { useState } from "react";
import { Eye, EyeOff, ExternalLink, MonitorCheck } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";

type Props = {
  server: string;
  login: string;
  investorPassword: string;
  webTerminalUrl: string;
};

/**
 * Read-only MT5 access so investors can watch the pooled account live.
 * Only the INVESTOR (read-only) password is ever passed here.
 */
export function Mt5AccessCard({ server, login, investorPassword, webTerminalUrl }: Props) {
  const [show, setShow] = useState(false);

  const rows = [
    { label: "Server", value: server, mono: server },
    { label: "Login", value: login, mono: login },
  ];

  return (
    <div className="glass-card flex h-full flex-col rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Transparency</p>
          <h2 className="mt-1.5 font-serif text-xl text-ink">Watch the account live</h2>
        </div>
        <MonitorCheck className="size-5 shrink-0 text-gold-500" aria-hidden />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-dim">
        Log into MT5 with this read-only investor access and watch every position and the live
        equity of the pooled trading account.
      </p>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-vault-950/60 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">{row.label}</p>
              <p className="truncate font-mono text-sm text-ink">{row.mono}</p>
            </div>
            <CopyButton value={row.value} />
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 rounded-lg bg-vault-950/60 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">Investor password (read-only)</p>
            <p className="truncate font-mono text-sm text-ink">
              {show ? investorPassword : "•".repeat(Math.max(investorPassword.length, 8))}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="rounded-md border border-gold-600/25 p-1.5 text-ink-dim transition-colors hover:border-gold-500/50 hover:text-ink"
            >
              {show ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
            </button>
            <CopyButton value={investorPassword} />
          </div>
        </div>
      </div>

      <a
        href={webTerminalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost mt-4 px-5 py-2.5 text-sm"
      >
        Open MT5 web terminal
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
        This login can only view the account — it cannot place, modify or close trades.
      </p>
    </div>
  );
}

import { CopyButton } from "@/components/ui/CopyButton";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

export type Mt5Detail = readonly [label: string, value: string];

const MT5_ACCESS_LINKS = [
  ["Web terminal", "https://web.metatrader.app/terminal?lang=en"],
  [
    "Google Play",
    "https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5",
  ],
  ["App Store", "https://apps.apple.com/us/app/metatrader-5/id413251709"],
  [
    "Official APK",
    "https://download.terminal.free/cdn/web/metaquotes.software.corp/mt5/metatrader5.apk?utm_campaign=install.metaquotes&utm_source=www.metatrader5.com",
  ],
] as const;

export function Mt5AccountDetails({ details }: { details: readonly Mt5Detail[] }) {
  return (
    <>
      <dl className="grid sm:grid-cols-2">
        {details.map(([label, value], index) => (
          <div
            key={label}
            className={cn(
              "grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 px-5 py-3.5",
              index !== details.length - 1 && "border-b border-slate-200",
              index >= 2 && "sm:border-b-0",
              index % 2 === 0 && "sm:border-r sm:border-slate-200",
            )}
          >
            <dt className="text-xs font-medium uppercase leading-4 tracking-[.11em] text-ink-dim">
              {label}
            </dt>
            <dd className="grid min-w-0 grid-cols-[minmax(0,1fr)_1.75rem] items-center gap-2.5">
              <span className="min-w-0 break-words font-mono text-sm leading-5 text-ink">
                {value}
              </span>
              <CopyButton value={value} label={`Copy ${label}`} compact />
            </dd>
          </div>
        ))}
      </dl>
      <nav
        className="grid grid-cols-2 gap-2 border-t border-slate-200 p-3 sm:grid-cols-4"
        aria-label="MetaTrader 5 access and downloads"
      >
        {MT5_ACCESS_LINKS.map(([label, href]) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center text-xs font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            <span>{label}</span>
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
        ))}
      </nav>
    </>
  );
}
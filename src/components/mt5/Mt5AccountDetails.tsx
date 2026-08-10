import { CopyButton } from "@/components/ui/CopyButton";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

export type Mt5Detail = readonly [label: string, value: string];

const MT5_ACCESS_LINKS = [
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

const MT5_LOGIN_HELP_LINK =
  "https://www.google.com/search?q=how+to+login+into+mt5+ios+and+android";

export function Mt5AccountDetails({ details }: { details: readonly Mt5Detail[] }) {
  return (
    <>
      <dl className="grid sm:grid-cols-2">
        {details.map(([label, value], index) => (
          <div
            key={label}
            className={cn(
              "grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-2 px-4 py-3.5",
              index !== details.length - 1 && "border-b border-slate-200",
              index >= 2 && "sm:border-b-0",
              index % 2 === 0 && "sm:border-r sm:border-slate-200",
            )}
          >
            <dt className="text-xs font-medium uppercase leading-4 tracking-[.11em] text-ink-dim">
              {label}
            </dt>
            <dd className="grid min-w-0 grid-cols-[minmax(0,1fr)_1.75rem] items-center gap-2.5">
              <span className="min-w-0 whitespace-nowrap font-sans text-[clamp(0.67rem,2.8vw,0.875rem)] leading-5 tracking-[-0.025em] text-ink">
                {value}
              </span>
              <CopyButton value={value} label={`Copy ${label}`} compact />
            </dd>
          </div>
        ))}
      </dl>
      <nav
        className="border-t border-slate-200 p-3"
        aria-label="MetaTrader 5 access and downloads"
      >
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {MT5_ACCESS_LINKS.map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-2 text-center text-[0.65rem] font-semibold leading-tight text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50 sm:text-xs"
            >
              <span className="whitespace-nowrap">{label}</span>
              <ExternalLink className="size-3 shrink-0 sm:size-3.5" aria-hidden />
            </a>
          ))}
        </div>
        <a
          href={MT5_LOGIN_HELP_LINK}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
        >
          <span>How to log in to MT5</span>
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
        </a>
      </nav>
    </>
  );
}
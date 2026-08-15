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
              "grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2.5 px-4 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3 sm:px-5 sm:py-5",
              index !== details.length - 1 && "border-b border-slate-200",
              index >= 2 && "sm:border-b-0",
              index % 2 === 0 && "sm:border-r sm:border-slate-200",
            )}
          >
            <dt className="text-sm font-semibold uppercase leading-5 tracking-[.08em] text-ink-dim sm:text-base">
              {label}
            </dt>
            <dd className="grid min-w-0 grid-cols-[minmax(0,1fr)_1.75rem] items-center gap-2.5">
              <span
                className={cn(
                  "min-w-0 whitespace-nowrap font-sans font-semibold leading-6 tracking-[-0.04em] text-ink",
                  value.length >= 20
                    ? "text-[clamp(0.72rem,2.9vw,1rem)]"
                    : "text-[clamp(0.95rem,4vw,1.25rem)]",
                )}
              >
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
              className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-3 text-center text-[clamp(0.72rem,3vw,1rem)] font-bold leading-tight text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              <span className="whitespace-nowrap">{label}</span>
              <ExternalLink className="size-3.5 shrink-0 sm:size-4" aria-hidden />
            </a>
          ))}
        </div>
        <a
          href={MT5_LOGIN_HELP_LINK}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-base font-bold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
        >
          <span>How to log in to MT5</span>
          <ExternalLink className="size-4 shrink-0" aria-hidden />
        </a>
      </nav>
    </>
  );
}

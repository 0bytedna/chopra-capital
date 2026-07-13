import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "error";

const tones: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: "border-gold-600/25 bg-gold-600/8 text-ink-dim", Icon: Info },
  success: { box: "border-positive/30 bg-positive/10 text-positive", Icon: CheckCircle2 },
  warning: { box: "border-gold-500/35 bg-gold-500/10 text-gold-300", Icon: AlertTriangle },
  error: { box: "border-negative/35 bg-negative/10 text-negative", Icon: AlertTriangle },
};

export function Alert({ tone = "info", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const { box, Icon } = tones[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

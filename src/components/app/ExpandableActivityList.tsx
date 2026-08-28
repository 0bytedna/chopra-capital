"use client";

import { useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function ExpandableActivityList({
  batches,
  total,
  batchSize = 5,
}: {
  batches: ReactNode[];
  total: number;
  batchSize?: number;
}) {
  const [visibleBatches, setVisibleBatches] = useState(1);
  const visibleCount = Math.min(total, visibleBatches * batchSize);
  const remaining = Math.max(0, total - visibleCount);
  const canCollapse = visibleBatches > 1;

  if (batches.length === 0) return null;

  return (
    <div>
      <div className="space-y-2">{batches.slice(0, visibleBatches)}</div>
      {(remaining > 0 || canCollapse) && (
        <div
          className={cn(
            "mt-3 grid gap-2",
            remaining > 0 && canCollapse ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {remaining > 0 && (
            <button
              type="button"
              aria-expanded={canCollapse}
              onClick={() => setVisibleBatches((current) => current + 1)}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
            >
              <Plus className="size-4" aria-hidden />
              Show {Math.min(batchSize, remaining)} more
            </button>
          )}
          {canCollapse && (
            <button
              type="button"
              onClick={() => setVisibleBatches(1)}
              className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
            >
              <Minus className="size-4" aria-hidden />
              Collapse
            </button>
          )}
        </div>
      )}
    </div>
  );
}
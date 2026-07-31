"use client";

import { useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";

export function ExpandableActivityList({
  collapsed,
  expanded,
  total,
  initialCount = 5,
}: {
  collapsed: ReactNode;
  expanded: ReactNode;
  total: number;
  initialCount?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hiddenCount = Math.max(0, total - initialCount);

  if (hiddenCount === 0) {
    return collapsed;
  }

  return (
    <div>
      {isExpanded ? expanded : collapsed}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-slate-100">
          {isExpanded ? (
            <Minus className="size-4" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
        </span>
        {isExpanded ? "Show recent 5 only" : `Show ${hiddenCount} more`}
      </button>
    </div>
  );
}
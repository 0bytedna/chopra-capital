"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff, Rows3 } from "lucide-react";
import { cn } from "@/lib/cn";

type Density = "compact" | "comfortable";

export function AdminTablePreferences({
  storageKey,
  children,
  allowNotesToggle = false,
}: {
  storageKey: string;
  children: ReactNode;
  allowNotesToggle?: boolean;
}) {
  const [density, setDensity] = useState<Density>("comfortable");
  const [showNotes, setShowNotes] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null") as { density?: Density; showNotes?: boolean } | null;
        if (saved?.density === "compact" || saved?.density === "comfortable") setDensity(saved.density);
        if (typeof saved?.showNotes === "boolean") setShowNotes(saved.showNotes);
      } catch {
        // Ignore unavailable or invalid browser storage.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  function save(nextDensity: Density, nextShowNotes: boolean) {
    setDensity(nextDensity);
    setShowNotes(nextShowNotes);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ density: nextDensity, showNotes: nextShowNotes }));
    } catch {
      // Preferences are optional.
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-y border-stone-200 bg-stone-50 px-4 py-2">
        <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-ink-faint"><Rows3 className="size-3.5" />Table display</span>
        <button type="button" onClick={() => save(density === "compact" ? "comfortable" : "compact", showNotes)} className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-dim">
          {density === "compact" ? "Comfortable rows" : "Compact rows"}
        </button>
        {allowNotesToggle && <button type="button" onClick={() => save(density, !showNotes)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-dim">{showNotes ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{showNotes ? "Hide notes" : "Show notes"}</button>}
      </div>
      <div className={cn(density === "compact" && "[&_td]:!py-2 [&_th]:!py-2", !showNotes && "[&_.optional-note]:hidden")}>
        {children}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function ReferralLink({ publicId }: { publicId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const link =
      window.location.origin +
      "/signup?ref=" +
      encodeURIComponent(publicId);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gold-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-gold-700"
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      {copied ? "Referral link copied" : "Copy referral link"}
    </button>
  );
}

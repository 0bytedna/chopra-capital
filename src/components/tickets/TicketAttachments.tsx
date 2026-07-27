import Image from "next/image";
import { Download, FileText } from "lucide-react";

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toLocaleString("en-US", { maximumFractionDigits: 1 })} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("en-US")} KB`;
}

export function TicketAttachments({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-3 space-y-2" aria-label="Message attachments">
      {attachments.map((attachment) => {
        const url = `/api/ticket-attachment/${attachment.id}`;

        if (attachment.mimeType.startsWith("image/")) {
          return (
            <a
              key={attachment.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl border border-gold-600/20 bg-vault-950/50"
            >
              <Image
                src={url}
                alt={attachment.fileName}
                width={720}
                height={405}
                unoptimized
                className="max-h-72 w-full object-contain"
              />
              <span className="flex items-center justify-between gap-3 border-t border-gold-600/15 px-3 py-2 text-xs">
                <span className="min-w-0 truncate text-ink-dim">{attachment.fileName}</span>
                <span className="shrink-0 text-ink-faint">{formatFileSize(attachment.size)}</span>
              </span>
            </a>
          );
        }

        if (attachment.mimeType.startsWith("video/")) {
          return (
            <div
              key={attachment.id}
              className="overflow-hidden rounded-xl border border-gold-600/20 bg-vault-950/50"
            >
              <video controls preload="metadata" className="max-h-72 w-full bg-black/30">
                <source src={url} type={attachment.mimeType} />
                Your browser cannot play this video.
              </video>
              <div className="flex items-center justify-between gap-3 border-t border-gold-600/15 px-3 py-2 text-xs">
                <span className="min-w-0 truncate text-ink-dim">{attachment.fileName}</span>
                <span className="shrink-0 text-ink-faint">{formatFileSize(attachment.size)}</span>
              </div>
            </div>
          );
        }

        return (
          <a
            key={attachment.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-gold-600/20 bg-vault-950/50 px-3 py-3 transition-colors hover:border-gold-500/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-600/10">
              <FileText className="size-4 text-gold-500" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-ink">{attachment.fileName}</span>
              <span className="block text-xs text-ink-faint">{formatFileSize(attachment.size)}</span>
            </span>
            <Download className="size-4 shrink-0 text-ink-faint" aria-hidden />
          </a>
        );
      })}
    </div>
  );
}

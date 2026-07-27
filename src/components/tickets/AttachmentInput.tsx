"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";

const ACCEPTED_FILES =
  ".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";

export function AttachmentInput() {
  const id = useId();
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = inputRef.current?.form;
    const clearFiles = () => setFiles([]);
    form?.addEventListener("reset", clearFiles);
    return () => form?.removeEventListener("reset", clearFiles);
  }, []);

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gold-600/25 bg-gold-600/8 px-3.5 py-2 text-sm text-ink-dim transition-colors hover:border-gold-500/45 hover:text-ink"
      >
        <Paperclip className="size-4 text-gold-500" aria-hidden />
        Attach photos, videos or documents
      </label>
      <input
        ref={inputRef}
        id={id}
        name="attachments"
        type="file"
        multiple
        accept={ACCEPTED_FILES}
        className="sr-only"
        onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
      />
      <p className="text-xs leading-relaxed text-ink-faint">
        Up to 5 files, 25 MB each and 40 MB total.
      </p>
      {files.length > 0 && (
        <ul className="space-y-1.5" aria-label="Selected attachments">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-vault-950/55 px-3 py-2 text-xs"
            >
              <span className="min-w-0 truncate text-ink-dim">{file.name}</span>
              <span className="shrink-0 text-ink-faint">
                {(file.size / 1024 / 1024).toLocaleString("en-US", { maximumFractionDigits: 1 })} MB
              </span>
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setFiles([]);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="inline-flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-negative"
        >
          <X className="size-3" aria-hidden />
          Remove selected files
        </button>
      )}
    </div>
  );
}

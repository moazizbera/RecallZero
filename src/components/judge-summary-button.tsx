"use client";

import { useState } from "react";

type JudgeSummaryButtonProps = {
  summary: string;
  buttonLabel?: string;
  copiedLabel?: string;
};

export function JudgeSummaryButton({
  summary,
  buttonLabel = "Copy judge summary",
  copiedLabel = "Summary copied",
}: JudgeSummaryButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center justify-center rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
    >
      {copied ? copiedLabel : buttonLabel}
    </button>
  );
}
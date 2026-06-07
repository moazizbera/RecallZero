"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SeedResponse = {
  ok: boolean;
  persistenceMode: "database" | "fallback";
  incidentCount: number;
  message: string;
};

export function ImportSeedButton({
  buttonLabel = "Seed demo incidents",
  pendingLabel = "Seeding demo incidents...",
}: {
  buttonLabel?: string;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const handleSeed = async () => {
    setMessage(null);

    try {
      const response = await fetch("/api/import/demo", {
        method: "POST",
      });

      const result = (await response.json()) as SeedResponse;

      setMessageTone(result.ok ? "success" : "error");
      setMessage(result.message);

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setMessageTone("error");
      setMessage("Unable to reach the import API right now.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleSeed}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? pendingLabel : buttonLabel}
      </button>
      {message ? (
        <p
          className={
            messageTone === "success"
              ? "text-sm text-[#1f6b45]"
              : "text-sm text-accent"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}